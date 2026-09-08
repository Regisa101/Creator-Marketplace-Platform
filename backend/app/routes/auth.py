from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import datetime

from app.database import get_db
from app.models import User, CreatorProfile, BusinessProfile, Campaign, Application, SavedCampaign
from app.schemas import UserCreate, UserLogin, TokenResponse, UserResponse, AccountDeleteRequest
from app.auth import hash_password, verify_password, create_access_token
from app.dependencies.auth import get_current_user

router = APIRouter(prefix="/api/auth", tags=["Authentication"])

@router.post("/register", response_model=TokenResponse)
async def register(user_data: UserCreate, db: Session = Depends(get_db)):
    # Check if user exists
    existing_user = db.query(User).filter(User.email == user_data.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )

    # Hash password
    hashed_password = hash_password(user_data.password)

    # Create user
    db_user = User(
        email=user_data.email,
        full_name=user_data.full_name,
        password=hashed_password,
        role=user_data.role
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)

    # Create the bare profile row for this role. We deliberately don't
    # pass niche/platform/audience_size (creator) or industry/team_size/
    # website (business) here — those fields either don't exist on the
    # models or belong to the Increment 2 onboarding flow, which fills
    # in bio/categories/content_types/etc. (creator) or business_type/
    # industry/preferences/etc. (business) via a separate endpoint after
    # registration. Registration just needs the row to exist.
    if user_data.role == "creator":
        creator_profile = CreatorProfile(
            user_id=db_user.id,
        )
        db.add(creator_profile)
        db.commit()

    elif user_data.role == "business":
        business_profile = BusinessProfile(
            user_id=db_user.id,
            company_name=user_data.company_name or f"{db_user.full_name}'s Company",
        )
        db.add(business_profile)
        db.commit()

    # Generate token
    token_data = {
        "sub": db_user.email,
        "user_id": db_user.id,
        "role": db_user.role
    }
    access_token = create_access_token(token_data)

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": db_user
    }

@router.post("/login", response_model=TokenResponse)
async def login(user_data: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == user_data.email).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )

    if not verify_password(user_data.password, user.password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )

    # Enforce that a creator account can only log in via the creator
    # login page/form, and a business account only via the business one.
    # `role` is the page the request came from (set by LoginCreator /
    # LoginBusiness on the frontend). Checked here, not just in the UI,
    # so this can't be bypassed by calling the API directly.
    if user_data.role and user_data.role != user.role:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=(
                f"This email is registered as a {user.role} account. "
                f"Please log in from the {user.role} login page."
            )
        )

    user.last_login = datetime.utcnow()
    db.commit()

    token_data = {
        "sub": user.email,
        "user_id": user.id,
        "role": user.role
    }
    access_token = create_access_token(token_data)

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": user
    }

@router.get("/me", response_model=UserResponse)
async def get_current_user_info(current_user: User = Depends(get_current_user)):
    return current_user

@router.delete("/account", status_code=status.HTTP_204_NO_CONTENT)
async def delete_account(
    payload: AccountDeleteRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Permanently deletes the logged-in user's account and every row
    that references it, for both creator and business accounts.

    Password confirmation is required so a hijacked/left-open session
    can't nuke an account with a single click.

    CreatorProfile / BusinessProfile (and CreatorSocial, via
    CreatorProfile) are already covered by the `cascade="all,
    delete-orphan"` relationships on User, so deleting `current_user`
    below removes those automatically. Campaigns, Applications, and
    SavedCampaigns are plain foreign keys with no ORM relationship
    declared on User, so they're NOT covered by that cascade and have
    to be deleted explicitly here first, in an order that respects
    their own foreign keys (saved campaigns/applications before the
    campaigns they point to).
    """
    if not verify_password(payload.password, current_user.password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect password",
        )

    if current_user.role == "creator":
        # This creator's own bookmarks and campaign applications.
        db.query(SavedCampaign).filter(
            SavedCampaign.creator_id == current_user.id
        ).delete(synchronize_session=False)

        db.query(Application).filter(
            Application.creator_id == current_user.id
        ).delete(synchronize_session=False)

    elif current_user.role == "business":
        campaign_ids = [
            row[0]
            for row in db.query(Campaign.id)
            .filter(Campaign.business_id == current_user.id)
            .all()
        ]

        if campaign_ids:
            # Other creators may have saved or applied to this
            # business's campaigns — those rows have to go before the
            # campaigns themselves, or the FK constraint blocks it.
            db.query(SavedCampaign).filter(
                SavedCampaign.campaign_id.in_(campaign_ids)
            ).delete(synchronize_session=False)

            db.query(Application).filter(
                Application.campaign_id.in_(campaign_ids)
            ).delete(synchronize_session=False)

            db.query(Campaign).filter(
                Campaign.business_id == current_user.id
            ).delete(synchronize_session=False)

    # Cascades to creator_profile/business_profile (and creator_socials).
    db.delete(current_user)
    db.commit()

    return None