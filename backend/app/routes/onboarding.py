from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from app.database import get_db
from app.models import User, CreatorProfile, CreatorSocial, BusinessProfile
from app.schemas.creator import CreatorOnboardingComplete
from app.schemas.business import BusinessOnboardingComplete
from app.dependencies.auth import get_current_user

router = APIRouter(prefix="/api/onboarding", tags=["Onboarding"])

# ============================================
# CREATOR ONBOARDING
# ============================================

@router.post("/creator/complete")
async def complete_creator_onboarding(
    data: CreatorOnboardingComplete,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role != "creator":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only creators can complete creator onboarding"
        )

    # Get or create profile
    profile = db.query(CreatorProfile).filter(CreatorProfile.user_id == current_user.id).first()
    if not profile:
        profile = CreatorProfile(user_id=current_user.id)
        db.add(profile)

    # ===== BASIC INFO =====
    profile.display_name = data.display_name
    profile.username = data.username
    profile.bio = data.bio
    profile.location = data.location
    profile.profile_image = data.profile_image

    # ===== TYPE & NICHE =====
    profile.creator_type = data.creator_type
    profile.categories = data.niches
    profile.content_types = data.content_types
    profile.languages = data.content_languages

    # ===== AUDIENCE =====
    profile.audience_age_range = data.audience_age_range
    profile.audience_location = data.audience_location
    profile.interests = data.audience_interests

    # ===== PRICING =====
    profile.starting_price = data.starting_price

    # ===== PORTFOLIO =====
    profile.portfolio = [item.dict() for item in data.portfolio]

    # ===== SOCIALS =====
    # `data.socials` is now a plain list (see schemas/creator.py) instead
    # of a fixed instagram/tiktok/youtube object, so this just replaces
    # whatever socials existed with whatever the client sent — same
    # delete-then-recreate pattern as before, just not filtered by a
    # "connected" flag that no longer exists.
    db.query(CreatorSocial).filter(CreatorSocial.creator_id == profile.id).delete()

    for social in data.socials:
        db.add(CreatorSocial(
            creator_id=profile.id,
            platform=social.platform,
            username=social.username,
            profile_url=social.profile_url,
            follower_count=social.follower_count or 0,
            is_verified=social.is_verified or False,
        ))

    # ===== STATUS =====
    profile.is_onboarding_complete = True
    profile.is_published = True

    try:
        db.commit()
    except IntegrityError:
        # Most likely cause: `username` is unique and someone else has
        # it. Roll back so the session isn't left in a broken state,
        # and surface something the frontend can show inline rather
        # than a raw 500.
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="That username is already taken. Please choose another."
        )

    db.refresh(profile)

    return {
        "message": "Creator onboarding completed successfully",
        "profile": profile
    }


# ============================================
# BUSINESS ONBOARDING
# ============================================

@router.post("/business/complete")
async def complete_business_onboarding(
    data: BusinessOnboardingComplete,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role != "business":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only businesses can complete business onboarding"
        )

    profile = db.query(BusinessProfile).filter(BusinessProfile.user_id == current_user.id).first()
    if not profile:
        profile = BusinessProfile(user_id=current_user.id)
        db.add(profile)

    # ===== BASIC INFO =====
    profile.company_name = data.company_name
    profile.business_type = data.business_type
    profile.industry = data.industry
    profile.location = data.location

    # ===== BUSINESS INFO =====
    profile.website = data.website
    profile.description = data.description
    profile.logo_url = data.logo_url
    profile.contact_phone = data.contact_phone

    # ===== PREFERENCES =====
    profile.interested_categories = data.interested_categories
    profile.preferred_content_types = data.preferred_content_types
    profile.typical_budget = data.typical_budget

    # ===== TEAM =====
    profile.team_size = data.team_size
    profile.year_established = data.year_established

    # ===== STATUS =====
    profile.is_onboarding_complete = True
    profile.is_published = True

    db.commit()
    db.refresh(profile)

    return {
        "message": "Business onboarding completed successfully",
        "profile": profile
    }


# ============================================
# GET PROFILES
# ============================================

@router.get("/creator/profile")
async def get_creator_profile(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role != "creator":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only creators can access creator profile"
        )

    profile = db.query(CreatorProfile).filter(CreatorProfile.user_id == current_user.id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Creator profile not found")

    return {
        "profile": profile,
        "socials": profile.socials
    }


@router.get("/business/profile")
async def get_business_profile(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role != "business":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only businesses can access business profile"
        )

    profile = db.query(BusinessProfile).filter(BusinessProfile.user_id == current_user.id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Business profile not found")

    return {"profile": profile}