from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from app.database import get_db
from app.models import User, CreatorProfile, CreatorSocial, BusinessProfile
from app.schemas.creator import CreatorOnboardingComplete, CreatorOnboardingProgress
from app.schemas.business import BusinessOnboardingComplete, BusinessOnboardingProgress
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
# CREATOR ONBOARDING — PARTIAL PROGRESS
# ============================================
# This is the endpoint that was missing before: `saveStep1Progress` /
# `saveStep2Progress` / `saveStep3Progress` on the frontend used to
# only update AuthContext's client-side, localStorage-backed cache —
# nothing was ever sent to the server. So refreshing, switching
# browsers, or the cache getting cleared would silently drop all
# progress. This upserts just the fields the current step actually
# collected, without requiring the full onboarding payload and without
# marking the profile complete/published.

@router.patch("/creator/progress")
async def save_creator_progress(
    data: CreatorOnboardingProgress,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role != "creator":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only creators can update creator onboarding progress"
        )

    profile = db.query(CreatorProfile).filter(CreatorProfile.user_id == current_user.id).first()
    if not profile:
        profile = CreatorProfile(user_id=current_user.id)
        db.add(profile)

    # Only fields actually present in this step's payload — a step 2
    # save must never overwrite step 1's fields with None just because
    # they weren't part of this particular request.
    fields = data.dict(exclude_unset=True, exclude={"socials", "portfolio"})

    # Client-facing field name -> DB column name, same mapping as
    # complete_creator_onboarding above (niches -> categories,
    # content_languages -> languages, audience_interests -> interests).
    field_map = {
        "display_name": "display_name",
        "username": "username",
        "bio": "bio",
        "location": "location",
        "profile_image": "profile_image",
        "creator_type": "creator_type",
        "niches": "categories",
        "content_types": "content_types",
        "content_languages": "languages",
        "audience_age_range": "audience_age_range",
        "audience_location": "audience_location",
        "audience_interests": "interests",
        "starting_price": "starting_price",
    }

    for client_field, value in fields.items():
        column = field_map.get(client_field)
        if column:
            setattr(profile, column, value)

    if data.portfolio is not None:
        profile.portfolio = [item.dict() for item in data.portfolio]

    if data.socials is not None:
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

    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="That username is already taken. Please choose another."
        )

    db.refresh(profile)

    return {
        "profile": profile,
        "socials": profile.socials
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
# BUSINESS ONBOARDING — PARTIAL PROGRESS
# ============================================
# Mirrors PATCH /creator/progress: upserts just the fields the current
# step collected, without requiring the full onboarding payload and
# without marking the profile complete/published. No field-name
# remapping needed here (unlike creator's niches->categories etc.) —
# BusinessOnboardingProgress's field names already match the
# BusinessProfile column names 1:1.

@router.patch("/business/progress")
async def save_business_progress(
    data: BusinessOnboardingProgress,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role != "business":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only businesses can update business onboarding progress"
        )

    profile = db.query(BusinessProfile).filter(BusinessProfile.user_id == current_user.id).first()
    if not profile:
        profile = BusinessProfile(user_id=current_user.id, company_name=data.company_name or "")
        db.add(profile)

    fields = data.dict(exclude_unset=True)
    for field_name, value in fields.items():
        setattr(profile, field_name, value)

    db.commit()
    db.refresh(profile)

    return {"profile": profile}


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