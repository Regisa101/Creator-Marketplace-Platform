import re
import secrets
from datetime import datetime

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.config import FRONTEND_URL, GOOGLE_CLIENT_ID, PASSWORD_RESET_EXPIRE_MINUTES
from app.database import get_db
from app.models import User, CreatorProfile, BusinessProfile, Campaign, Application, SavedCampaign
from app.schemas import UserCreate, UserLogin, TokenResponse, UserResponse, AccountDeleteRequest
from app.schemas.user import (
    GoogleAuthRequest,
    GoogleAuthResponse,
    ForgotPasswordRequest,
    ResetPasswordRequest,
    MessageResponse,
)
from app.auth import (
    hash_password,
    verify_password,
    create_access_token,
    create_password_reset_token,
    decode_password_reset_token,
    password_fingerprint,
)
from app.services.email_service import send_password_reset_email
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

# ----------------------------------------------------------------------
# Google sign-in
# ----------------------------------------------------------------------
@router.post("/google", response_model=GoogleAuthResponse)
def google_auth(data: GoogleAuthRequest, db: Session = Depends(get_db)):
    """Log in (or sign up) with a Google ID token.

    Plain `def` on purpose: verifying the token may fetch Google's public
    keys over the network, so FastAPI runs it in a worker thread instead of
    blocking the event loop.
    """
    if not GOOGLE_CLIENT_ID:
        raise HTTPException(status_code=503, detail="Google sign-in is not configured.")

    try:
        from google.oauth2 import id_token as google_id_token
        from google.auth.transport import requests as google_requests
    except ImportError:
        raise HTTPException(
            status_code=503,
            detail="Google sign-in is not installed on the server (pip install google-auth requests).",
        )

    # Checks the signature, the expiry AND that the token was issued for YOUR client id.
    try:
        info = google_id_token.verify_oauth2_token(
            data.credential, google_requests.Request(), GOOGLE_CLIENT_ID
        )
    except ValueError:
        raise HTTPException(status_code=401, detail="Invalid Google sign-in. Please try again.")

    if not info.get("email_verified") or not info.get("email"):
        raise HTTPException(status_code=400, detail="Your Google email is not verified.")

    email = info["email"].strip().lower()
    user = db.query(User).filter(func.lower(User.email) == email).first()
    is_new_user = False

    if user:
        if data.role and data.role != user.role:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=(
                    f"This email is registered as a {user.role} account. "
                    f"Please use the {user.role} page."
                ),
            )
    else:
        if data.role not in ("creator", "business"):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No account found for this Google email. Please sign up first.",
            )
        is_new_user = True
        user = User(
            email=email,
            full_name=(info.get("name") or email.split("@")[0]).strip(),
            # The column is NOT NULL. Google users never type this; a random
            # hash keeps password login impossible until they use "Forgot password".
            password=hash_password(secrets.token_urlsafe(32)),
            role=data.role,
        )
        db.add(user)
        db.commit()
        db.refresh(user)

        if data.role == "creator":
            db.add(CreatorProfile(user_id=user.id))
        else:
            db.add(BusinessProfile(user_id=user.id, company_name=f"{user.full_name}'s Company"))
        db.commit()

    user.last_login = datetime.utcnow()
    db.commit()

    token = create_access_token({"sub": user.email, "user_id": user.id, "role": user.role})
    return {"access_token": token, "token_type": "bearer", "user": user, "is_new_user": is_new_user}


# ----------------------------------------------------------------------
# Forgot / reset password
# ----------------------------------------------------------------------
_RESET_INVALID = "This reset link is invalid or has expired. Please request a new one."


def _check_new_password(password: str) -> None:
    """Same rule the register pages enforce."""
    if len(password) < 8 or not re.search(r"[A-Za-z]", password) or not re.search(r"[0-9]", password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must be at least 8 characters and include a letter and a number.",
        )


@router.post("/forgot-password", response_model=MessageResponse)
async def forgot_password(
    data: ForgotPasswordRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    """Email a reset link. Always answers the same way, so nobody can use this
    form to find out which emails have accounts."""
    user = db.query(User).filter(func.lower(User.email) == data.email.strip().lower()).first()

    if user and user.is_active is not False:
        token = create_password_reset_token(user.id, user.password)
        background_tasks.add_task(
            send_password_reset_email,
            to_email=user.email,
            name=user.full_name,
            reset_url=f"{FRONTEND_URL}/reset-password?token={token}",
            expires_minutes=PASSWORD_RESET_EXPIRE_MINUTES,
        )

    return {"message": "If an account exists for that email, a reset link is on its way."}


@router.post("/reset-password", response_model=MessageResponse)
async def reset_password(data: ResetPasswordRequest, db: Session = Depends(get_db)):
    _check_new_password(data.new_password)

    payload = decode_password_reset_token(data.token)
    if not payload:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=_RESET_INVALID)

    try:
        user_id = int(payload["sub"])
    except (TypeError, ValueError):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=_RESET_INVALID)

    user = db.query(User).filter(User.id == user_id).first()
    # The fingerprint only matches while the password is unchanged -> link is single-use.
    if not user or payload.get("fp") != password_fingerprint(user.password):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=_RESET_INVALID)

    user.password = hash_password(data.new_password)
    db.commit()
    return {"message": "Your password has been updated. You can log in now."}

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