from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import datetime

from app.database import get_db
from app.models import User, CreatorProfile, BusinessProfile
from app.schemas import UserCreate, UserLogin, TokenResponse, UserResponse
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