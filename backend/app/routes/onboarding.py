from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from app.database import get_db

from app.models import (
    User,
    CreatorProfile,
    CreatorSocial,
    BusinessProfile,
    Campaign,
    Application,
)

from app.schemas.creator import (
    CreatorOnboardingComplete,
    CreatorOnboardingProgress,
)

from app.schemas.business import (
    BusinessOnboardingComplete,
    BusinessOnboardingProgress,
)

from app.dependencies.auth import get_current_user


router = APIRouter(
    prefix="/api/onboarding",
    tags=["Onboarding"],
)


# ============================================================
# CREATOR ONBOARDING
# ============================================================

@router.post("/creator/complete")
async def complete_creator_onboarding(
    data: CreatorOnboardingComplete,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role != "creator":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only creators can complete creator onboarding",
        )

    profile = (
        db.query(CreatorProfile)
        .filter(
            CreatorProfile.user_id == current_user.id
        )
        .first()
    )

    if not profile:
        profile = CreatorProfile(
            user_id=current_user.id
        )
        db.add(profile)

    profile.display_name = data.display_name
    profile.username = data.username
    profile.bio = data.bio
    profile.location = data.location
    profile.profile_image = data.profile_image
    profile.creator_type = data.creator_type
    profile.categories = data.niches
    profile.content_types = data.content_types
    profile.languages = data.content_languages
    profile.audience_age_range = data.audience_age_range
    profile.audience_location = data.audience_location
    profile.interests = data.audience_interests
    profile.starting_price = data.starting_price

    profile.portfolio = [
        item.dict()
        for item in data.portfolio
    ]

    # Remove old social records and recreate them.
    db.query(CreatorSocial).filter(
        CreatorSocial.creator_id == profile.id
    ).delete(
        synchronize_session=False
    )

    for social in data.socials:
        db.add(
            CreatorSocial(
                creator_id=profile.id,
                platform=social.platform,
                username=social.username,
                profile_url=social.profile_url,
                follower_count=social.follower_count or 0,
                is_verified=social.is_verified or False,
            )
        )

    profile.is_onboarding_complete = True
    profile.is_published = True

    try:
        db.commit()

    except IntegrityError:
        db.rollback()

        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="That username is already taken. Please choose another.",
        )

    db.refresh(profile)

    return {
        "message": "Creator onboarding completed successfully",
        "profile": profile,
    }


# ============================================================
# CREATOR ONBOARDING PROGRESS
# ============================================================

@router.patch("/creator/progress")
async def save_creator_progress(
    data: CreatorOnboardingProgress,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role != "creator":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only creators can update creator onboarding progress",
        )

    profile = (
        db.query(CreatorProfile)
        .filter(
            CreatorProfile.user_id == current_user.id
        )
        .first()
    )

    if not profile:
        profile = CreatorProfile(
            user_id=current_user.id
        )
        db.add(profile)

    fields = data.dict(
        exclude_unset=True,
        exclude={
            "socials",
            "portfolio",
        },
    )

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

        column = field_map.get(
            client_field
        )

        if column:
            setattr(
                profile,
                column,
                value,
            )

    if data.portfolio is not None:

        profile.portfolio = [
            item.dict()
            for item in data.portfolio
        ]

    if data.socials is not None:

        db.query(CreatorSocial).filter(
            CreatorSocial.creator_id == profile.id
        ).delete(
            synchronize_session=False
        )

        for social in data.socials:

            db.add(
                CreatorSocial(
                    creator_id=profile.id,
                    platform=social.platform,
                    username=social.username,
                    profile_url=social.profile_url,
                    follower_count=social.follower_count or 0,
                    is_verified=social.is_verified or False,
                )
            )

    try:
        db.commit()

    except IntegrityError:
        db.rollback()

        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="That username is already taken. Please choose another.",
        )

    db.refresh(profile)

    return {
        "profile": profile,
        "socials": profile.socials,
    }


# ============================================================
# BUSINESS ONBOARDING
# ============================================================

@router.post("/business/complete")
async def complete_business_onboarding(
    data: BusinessOnboardingComplete,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role != "business":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only businesses can complete business onboarding",
        )

    profile = (
        db.query(BusinessProfile)
        .filter(
            BusinessProfile.user_id == current_user.id
        )
        .first()
    )

    if not profile:
        profile = BusinessProfile(
            user_id=current_user.id
        )
        db.add(profile)

    profile.company_name = data.company_name
    profile.business_type = data.business_type
    profile.industry = data.industry
    profile.location = data.location
    profile.website = data.website
    profile.description = data.description
    profile.logo_url = data.logo_url
    profile.contact_phone = data.contact_phone

    profile.interested_categories = (
        data.interested_categories
    )

    profile.preferred_content_types = (
        data.preferred_content_types
    )

    profile.typical_budget = data.typical_budget
    profile.team_size = data.team_size
    profile.year_established = data.year_established

    profile.is_onboarding_complete = True
    profile.is_published = True

    db.commit()
    db.refresh(profile)

    return {
        "message": "Business onboarding completed successfully",
        "profile": profile,
    }


# ============================================================
# BUSINESS ONBOARDING PROGRESS
# ============================================================

@router.patch("/business/progress")
async def save_business_progress(
    data: BusinessOnboardingProgress,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role != "business":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only businesses can update business onboarding progress",
        )

    profile = (
        db.query(BusinessProfile)
        .filter(
            BusinessProfile.user_id == current_user.id
        )
        .first()
    )

    if not profile:
        profile = BusinessProfile(
            user_id=current_user.id
        )
        db.add(profile)

    fields = data.dict(
        exclude_unset=True
    )

    for field_name, value in fields.items():

        if hasattr(
            profile,
            field_name,
        ):
            setattr(
                profile,
                field_name,
                value,
            )

    db.commit()
    db.refresh(profile)

    # --------------------------------------------------------
    # Completed collaboration history
    #
    # No Deliverable model is queried anymore.
    # The current workflow ends when the selected creator's
    # payment succeeds.
    # --------------------------------------------------------

    completed_apps = (
        db.query(Application)
        .join(
            Campaign,
            Campaign.id == Application.campaign_id,
        )
        .filter(
            Campaign.business_id == current_user.id,
            Application.status == "completed",
        )
        .order_by(
            Application.updated_at.desc()
        )
        .all()
    )

    history = []
    creator_ids = set()

    for application in completed_apps:

        creator = (
            db.query(User)
            .filter(
                User.id == application.creator_id
            )
            .first()
        )

        campaign = (
            db.query(Campaign)
            .filter(
                Campaign.id == application.campaign_id
            )
            .first()
        )

        creator_ids.add(
            application.creator_id
        )

        creator_name = None

        if creator:

            if creator.profile:

                creator_name = (
                    creator.profile.get(
                        "display_name"
                    )
                    if isinstance(
                        creator.profile,
                        dict,
                    )
                    else None
                )

            if not creator_name:
                creator_name = creator.full_name

        history.append(
            {
                "application_id": application.id,
                "campaign_id": application.campaign_id,
                "campaign_title": (
                    campaign.title
                    if campaign
                    else "Campaign"
                ),
                "creator_id": application.creator_id,
                "creator_name": creator_name,
                "completed_at": application.updated_at,
            }
        )

    return {
        "profile": profile,
        "completed_collaborations": len(history),
        "creators_worked_with": len(creator_ids),
        "work_history": history,
    }


# ============================================================
# GET CREATOR PROFILE
# ============================================================

@router.get("/creator/profile")
async def get_creator_profile(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role != "creator":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only creators can access creator profile",
        )

    profile = (
        db.query(CreatorProfile)
        .filter(
            CreatorProfile.user_id == current_user.id
        )
        .first()
    )

    if not profile:
        raise HTTPException(
            status_code=404,
            detail="Creator profile not found",
        )

    completed_apps = (
        db.query(Application)
        .filter(
            Application.creator_id == current_user.id,
            Application.status == "completed",
        )
        .order_by(
            Application.updated_at.desc()
        )
        .all()
    )

    history = []

    for application in completed_apps:

        campaign = (
            db.query(Campaign)
            .filter(
                Campaign.id == application.campaign_id
            )
            .first()
        )

        business = None

        if campaign:

            business = (
                db.query(User)
                .filter(
                    User.id == campaign.business_id
                )
                .first()
            )

        business_name = None

        if business:

            if business.profile and isinstance(
                business.profile,
                dict,
            ):
                business_name = (
                    business.profile.get(
                        "company_name"
                    )
                )

            if not business_name:
                business_name = (
                    business.full_name
                )

        history.append(
            {
                "campaign_id": application.campaign_id,
                "campaign_title": (
                    campaign.title
                    if campaign
                    else "Campaign"
                ),
                "business_name": business_name,
                "completed_at": application.updated_at,
            }
        )

    return {
        "profile": profile,
        "socials": profile.socials,
        "work_history": history,
        "completed_collaborations": len(history),
    }


# ============================================================
# GET BUSINESS PROFILE
# ============================================================

@router.get("/business/profile")
async def get_business_profile(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role != "business":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only businesses can access business profile",
        )

    profile = (
        db.query(BusinessProfile)
        .filter(
            BusinessProfile.user_id == current_user.id
        )
        .first()
    )

    if not profile:
        raise HTTPException(
            status_code=404,
            detail="Business profile not found",
        )

    return {
        "profile": profile
    }


# ============================================================
# BUSINESS CAMPAIGN DEFAULTS
# ============================================================

@router.get("/business/campaign-defaults")
async def get_business_campaign_defaults(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role != "business":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only businesses can access campaign defaults",
        )

    profile = (
        db.query(BusinessProfile)
        .filter(
            BusinessProfile.user_id == current_user.id
        )
        .first()
    )

    if not profile:
        raise HTTPException(
            status_code=404,
            detail="Business profile not found",
        )

    return {
        "default_dos": profile.default_dos or [],
        "default_donts": profile.default_donts or [],
        "default_video_spec": profile.default_video_spec,
        "default_creator_requirements": (
            profile.default_creator_requirements
        ),
        "default_application_questions": (
            profile.default_application_questions or []
        ),
    }


# ============================================================
# SAVE BUSINESS CAMPAIGN DEFAULTS
# ============================================================

@router.patch("/business/campaign-defaults")
async def save_business_campaign_defaults(
    data: BusinessOnboardingProgress,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role != "business":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only businesses can update campaign defaults",
        )

    profile = (
        db.query(BusinessProfile)
        .filter(
            BusinessProfile.user_id == current_user.id
        )
        .first()
    )

    if not profile:
        raise HTTPException(
            status_code=404,
            detail="Complete business onboarding before saving campaign defaults",
        )

    profile.default_dos = (
        data.default_dos or []
    )

    profile.default_donts = (
        data.default_donts or []
    )

    profile.default_creator_requirements = (
        data.default_creator_requirements
    )

    profile.default_application_questions = (
        data.default_application_questions or []
    )

    if data.default_video_spec:
        profile.default_video_spec = (
            data.default_video_spec.dict()
        )
    else:
        profile.default_video_spec = None

    db.commit()
    db.refresh(profile)

    return {
        "default_dos": profile.default_dos or [],
        "default_donts": profile.default_donts or [],
        "default_video_spec": profile.default_video_spec,
        "default_creator_requirements": (
            profile.default_creator_requirements
        ),
        "default_application_questions": (
            profile.default_application_questions or []
        ),
    }