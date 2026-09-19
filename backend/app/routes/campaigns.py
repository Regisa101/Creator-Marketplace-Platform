from __future__ import annotations

from datetime import datetime, timezone, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies.auth import (
    get_current_business,
    get_current_user,
    get_current_user_optional,
)
from app.models import User, Campaign, Application
from app.models.campaign import CampaignStatus
from app.schemas.campaign import (
    CampaignCreate,
    CampaignUpdate,
    CampaignResponse,
)


router = APIRouter(
    prefix="/api/campaigns",
    tags=["Campaigns"],
)


# ============================================================
# HELPERS
# ============================================================

def _as_date(value: Optional[datetime]):
    """
    Convert a datetime into a UTC calendar date.

    This is useful because browser date inputs often send midnight,
    and we care about the selected calendar day rather than the
    exact current time.
    """
    if value is None:
        return None

    if value.tzinfo is None:
        return value.date()

    return value.astimezone(timezone.utc).date()


def _validate_campaign_dates(
    application_deadline: Optional[datetime],
    start_date: Optional[datetime],
    end_date: Optional[datetime],
) -> None:
    """
    Validate campaign timeline.

    Rules:
    - Application deadline cannot be in the past.
    - Start date cannot be before today.
    - End date cannot be before start date.
    - Application deadline should not be after the campaign end date.
    """

    today = datetime.now(timezone.utc).date()

    application_date = _as_date(application_deadline)
    start = _as_date(start_date)
    end = _as_date(end_date)

    if application_date is not None and application_date < today:
        raise HTTPException(
            status_code=400,
            detail="Application deadline cannot be in the past.",
        )

    if start is not None and start < today:
        raise HTTPException(
            status_code=400,
            detail="Campaign start date cannot be in the past.",
        )

    if start is not None and end is not None and end < start:
        raise HTTPException(
            status_code=400,
            detail="Campaign end date must be on or after the start date.",
        )

    if (
        application_date is not None
        and end is not None
        and application_date > end
    ):
        raise HTTPException(
            status_code=400,
            detail="Application deadline cannot be after the campaign end date.",
        )


def _application_count(
    db: Session,
    campaign_id: int,
) -> int:
    return (
        db.query(Application)
        .filter(Application.campaign_id == campaign_id)
        .count()
    )


def _campaign_to_response(
    db: Session,
    campaign: Campaign,
) -> Campaign:
    """
    Add application_count before returning the SQLAlchemy object.

    CampaignResponse uses from_attributes=True, so returning the
    ORM object keeps the response clean and consistent.
    """

    campaign.application_count = _application_count(
        db,
        campaign.id,
    )

    return campaign


# ============================================================
# PUBLIC CAMPAIGNS
# ============================================================

@router.get(
    "/public",
    response_model=dict,
)
async def get_public_campaigns(
    status: Optional[str] = None,
    category: Optional[str] = None,
    search: Optional[str] = None,
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db),
):
    """
    Public campaign marketplace.

    Only published and in-progress campaigns are visible publicly.

    Draft, cancelled, completed, and closed campaigns are private.
    """

    query = (
        db.query(Campaign)
        .filter(
            Campaign.status.in_(
                [
                    CampaignStatus.PUBLISHED,
                    CampaignStatus.IN_PROGRESS,
                ]
            ),
            Campaign.is_active.is_(True),
        )
    )

    if status:
        query = query.filter(
            Campaign.status == status
        )

    if category:
        query = query.filter(
            Campaign.category == category
        )

    if search:
        search_term = f"%{search}%"

        query = query.filter(
            Campaign.title.ilike(search_term)
            | Campaign.description.ilike(search_term)
            | Campaign.category.ilike(search_term)
        )

    total = query.count()

    offset = (page - 1) * limit

    campaigns = (
        query
        .order_by(Campaign.created_at.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )

    result = []

    for campaign in campaigns:
        business = (
            db.query(User)
            .filter(User.id == campaign.business_id)
            .first()
        )

        business_profile = (
            business.business_profile
            if business
            else None
        )

        result.append(
            {
                "id": campaign.id,
                "business_id": campaign.business_id,

                "title": campaign.title,
                "category": campaign.category,
                "description": campaign.description,

                "responsibilities": campaign.responsibilities,

                "creator_types": campaign.creator_types,
                "experience_level": campaign.experience_level,
                "required_skills": campaign.required_skills,
                "location": campaign.location,
                "work_arrangement": campaign.work_arrangement,
                "requirements": campaign.requirements,

                "deliverables": campaign.deliverables,
                "creators_needed": campaign.creators_needed,

                "engagement_type": campaign.engagement_type,
                "duration": campaign.duration,

                "pricing_model": campaign.pricing_model,
                "compensation_type": campaign.compensation_type,
                "budget": (
                    float(campaign.budget)
                    if campaign.budget is not None
                    else None
                ),
                "budget_min": (
                    float(campaign.budget_min)
                    if campaign.budget_min is not None
                    else None
                ),
                "budget_max": (
                    float(campaign.budget_max)
                    if campaign.budget_max is not None
                    else None
                ),
                "compensation_description": (
                    campaign.compensation_description
                ),

                "start_date": campaign.start_date,
                "end_date": campaign.end_date,
                "application_deadline": (
                    campaign.application_deadline
                ),

                "application_questions": (
                    campaign.application_questions or []
                ),

                "hero_image": campaign.hero_image,

                "status": campaign.status,
                "is_active": campaign.is_active,

                "created_at": campaign.created_at,
                "updated_at": campaign.updated_at,

                "application_count": _application_count(
                    db,
                    campaign.id,
                ),

                # Public business information comes from
                # the business profile, not duplicated campaign data.
                "brand_name": (
                    business_profile.company_name
                    if business_profile
                    else (
                        business.full_name
                        if business
                        else None
                    )
                ),
                "brand_location": (
                    business_profile.location
                    if business_profile
                    else None
                ),
                "brand_logo": (
                    business_profile.logo_url
                    if business_profile
                    else None
                ),
            }
        )

    return {
        "campaigns": result,
        "total": total,
        "page": page,
        "limit": limit,
        "pages": (
            (total + limit - 1) // limit
            if total
            else 0
        ),
    }


# ============================================================
# CREATE CAMPAIGN
# ============================================================

@router.post(
    "/",
    response_model=CampaignResponse,
)
async def create_campaign(
    data: CampaignCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_business),
):
    """
    Create a new campaign.

    New campaigns always start as drafts.
    """

    _validate_campaign_dates(
        application_deadline=data.application_deadline,
        start_date=data.start_date,
        end_date=data.end_date,
    )

    if (
        data.budget_min is not None
        and data.budget_max is not None
        and data.budget_max < data.budget_min
    ):
        raise HTTPException(
            status_code=400,
            detail="Maximum budget cannot be lower than minimum budget.",
        )

    campaign = Campaign(
        business_id=current_user.id,

        # Basic information
        title=data.title.strip(),
        category=data.category.strip(),
        description=data.description.strip(),

        # Work
        responsibilities=(
            data.responsibilities.strip()
            if data.responsibilities
            else None
        ),

        deliverables=data.deliverables,

        creators_needed=data.creators_needed,

        # Creator requirements
        creator_types=data.creator_types,
        experience_level=data.experience_level,
        required_skills=data.required_skills,
        location=(
            data.location.strip()
            if data.location
            else None
        ),
        work_arrangement=data.work_arrangement,
        requirements=(
            data.requirements.strip()
            if data.requirements
            else None
        ),

        # Engagement
        engagement_type=data.engagement_type,
        duration=data.duration,

        # Compensation
        pricing_model=data.pricing_model,
        compensation_type=data.compensation_type,
        budget=data.budget,
        budget_min=data.budget_min,
        budget_max=data.budget_max,
        compensation_description=(
            data.compensation_description.strip()
            if data.compensation_description
            else None
        ),

        # Timeline
        start_date=data.start_date,
        end_date=data.end_date,
        application_deadline=data.application_deadline,

        # Screening
        application_questions=data.application_questions,

        # Image
        hero_image=data.hero_image,

        # System
        status=CampaignStatus.DRAFT,
        is_active=True,
    )

    db.add(campaign)
    db.commit()
    db.refresh(campaign)

    campaign.application_count = 0

    return campaign


# ============================================================
# GET CAMPAIGNS
# ============================================================

@router.get(
    "/",
    response_model=dict,
)
async def get_campaigns(
    status: Optional[str] = None,
    category: Optional[str] = None,
    search: Optional[str] = None,
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=50),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Get campaigns according to the logged-in user's role.

    Creator:
        Published and in-progress marketplace campaigns.

    Business:
        All campaigns owned by that business.
    """

    query = db.query(Campaign)

    if current_user.role == "creator":

        query = query.filter(
            Campaign.status.in_(
                [
                    CampaignStatus.PUBLISHED,
                    CampaignStatus.IN_PROGRESS,
                ]
            ),
            Campaign.is_active.is_(True),
        )

    elif current_user.role == "business":

        query = query.filter(
            Campaign.business_id == current_user.id
        )

    else:
        raise HTTPException(
            status_code=403,
            detail="Only creators and businesses can access campaigns.",
        )

    if status:
        query = query.filter(
            Campaign.status == status
        )

    if category:
        query = query.filter(
            Campaign.category == category
        )

    if search:
        search_term = f"%{search}%"

        query = query.filter(
            Campaign.title.ilike(search_term)
            | Campaign.description.ilike(search_term)
            | Campaign.category.ilike(search_term)
        )

    total = query.count()

    offset = (page - 1) * limit

    campaigns = (
        query
        .order_by(Campaign.created_at.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )

    result = []

    for campaign in campaigns:

        business = (
            db.query(User)
            .filter(User.id == campaign.business_id)
            .first()
        )

        business_profile = (
            business.business_profile
            if business
            else None
        )

        result.append(
            {
                "id": campaign.id,
                "business_id": campaign.business_id,

                "title": campaign.title,
                "category": campaign.category,
                "description": campaign.description,

                "responsibilities": campaign.responsibilities,

                "creator_types": campaign.creator_types,
                "experience_level": campaign.experience_level,
                "required_skills": campaign.required_skills,
                "location": campaign.location,
                "work_arrangement": campaign.work_arrangement,
                "requirements": campaign.requirements,

                "deliverables": campaign.deliverables,
                "creators_needed": campaign.creators_needed,

                "engagement_type": campaign.engagement_type,
                "duration": campaign.duration,

                "pricing_model": campaign.pricing_model,
                "compensation_type": campaign.compensation_type,
                "budget": (
                    float(campaign.budget)
                    if campaign.budget is not None
                    else None
                ),
                "budget_min": (
                    float(campaign.budget_min)
                    if campaign.budget_min is not None
                    else None
                ),
                "budget_max": (
                    float(campaign.budget_max)
                    if campaign.budget_max is not None
                    else None
                ),
                "compensation_description": (
                    campaign.compensation_description
                ),

                "start_date": campaign.start_date,
                "end_date": campaign.end_date,
                "application_deadline": (
                    campaign.application_deadline
                ),

                "application_questions": (
                    campaign.application_questions or []
                ),

                "hero_image": campaign.hero_image,

                "status": campaign.status,
                "is_active": campaign.is_active,

                "created_at": campaign.created_at,
                "updated_at": campaign.updated_at,

                "application_count": _application_count(
                    db,
                    campaign.id,
                ),

                "brand_name": (
                    business_profile.company_name
                    if business_profile
                    else (
                        business.full_name
                        if business
                        else None
                    )
                ),

                "brand_location": (
                    business_profile.location
                    if business_profile
                    else None
                ),

                "brand_logo": (
                    business_profile.logo_url
                    if business_profile
                    else None
                ),
            }
        )

    return {
        "campaigns": result,
        "total": total,
        "page": page,
        "limit": limit,
        "pages": (
            (total + limit - 1) // limit
            if total
            else 0
        ),
    }


# ============================================================
# PUBLIC SINGLE CAMPAIGN
# ============================================================

@router.get(
    "/public/{campaign_id}",
    response_model=CampaignResponse,
)
async def get_public_campaign(
    campaign_id: int,
    db: Session = Depends(get_db),
):
    """
    Public campaign detail.

    No login is required to view a published campaign.
    """

    campaign = (
        db.query(Campaign)
        .filter(Campaign.id == campaign_id)
        .first()
    )

    if not campaign:
        raise HTTPException(
            status_code=404,
            detail="Campaign not found",
        )

    if (
        campaign.status
        not in (
            CampaignStatus.PUBLISHED,
            CampaignStatus.IN_PROGRESS,
        )
        or not campaign.is_active
    ):
        raise HTTPException(
            status_code=404,
            detail="Campaign not found",
        )

    return _campaign_to_response(
        db,
        campaign,
    )


# ============================================================
# SINGLE CAMPAIGN
# ============================================================

@router.get(
    "/{campaign_id}",
    response_model=CampaignResponse,
)
async def get_campaign(
    campaign_id: int,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(
        get_current_user_optional
    ),
):
    """
    Campaign detail.

    Public visitor:
        Published/in-progress only.

    Creator:
        Published/in-progress only.

    Business:
        Can view its own campaigns, including drafts.
    """

    campaign = (
        db.query(Campaign)
        .filter(Campaign.id == campaign_id)
        .first()
    )

    if not campaign:
        raise HTTPException(
            status_code=404,
            detail="Campaign not found",
        )

    # --------------------------------------------------------
    # Visitor
    # --------------------------------------------------------

    if current_user is None:

        if (
            campaign.status
            not in (
                CampaignStatus.PUBLISHED,
                CampaignStatus.IN_PROGRESS,
            )
            or not campaign.is_active
        ):
            raise HTTPException(
                status_code=404,
                detail="Campaign not found",
            )

    # --------------------------------------------------------
    # Creator
    # --------------------------------------------------------

    elif current_user.role == "creator":

        if (
            campaign.status
            not in (
                CampaignStatus.PUBLISHED,
                CampaignStatus.IN_PROGRESS,
            )
            or not campaign.is_active
        ):
            raise HTTPException(
                status_code=403,
                detail="Campaign not available.",
            )

    # --------------------------------------------------------
    # Business
    # --------------------------------------------------------

    elif current_user.role == "business":

        if campaign.business_id != current_user.id:
            raise HTTPException(
                status_code=403,
                detail="Access denied.",
            )

    # --------------------------------------------------------
    # Other roles
    # --------------------------------------------------------

    else:

        raise HTTPException(
            status_code=403,
            detail="Access denied.",
        )

    return _campaign_to_response(
        db,
        campaign,
    )


# ============================================================
# UPDATE CAMPAIGN
# ============================================================

@router.put(
    "/{campaign_id}",
    response_model=CampaignResponse,
)
async def update_campaign(
    campaign_id: int,
    data: CampaignUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_business),
):
    """
    Update a business-owned campaign.

    Completed campaigns cannot be edited.
    """

    campaign = (
        db.query(Campaign)
        .filter(Campaign.id == campaign_id)
        .first()
    )

    if not campaign:
        raise HTTPException(
            status_code=404,
            detail="Campaign not found",
        )

    if campaign.business_id != current_user.id:
        raise HTTPException(
            status_code=403,
            detail="Access denied.",
        )

    if campaign.status in (
        CampaignStatus.COMPLETED,
        CampaignStatus.CLOSED,
    ):
        raise HTTPException(
            status_code=400,
            detail="This campaign can no longer be edited.",
        )

    update_data = data.model_dump(
        exclude_unset=True
    )

    # --------------------------------------------------------
    # Budget validation
    # --------------------------------------------------------

    budget_min = update_data.get(
        "budget_min",
        campaign.budget_min,
    )

    budget_max = update_data.get(
        "budget_max",
        campaign.budget_max,
    )

    if (
        budget_min is not None
        and budget_max is not None
        and budget_max < budget_min
    ):
        raise HTTPException(
            status_code=400,
            detail="Maximum budget cannot be lower than minimum budget.",
        )

    # --------------------------------------------------------
    # Date validation
    # --------------------------------------------------------

    application_deadline = update_data.get(
        "application_deadline",
        campaign.application_deadline,
    )

    start_date = update_data.get(
        "start_date",
        campaign.start_date,
    )

    end_date = update_data.get(
        "end_date",
        campaign.end_date,
    )

    _validate_campaign_dates(
        application_deadline=application_deadline,
        start_date=start_date,
        end_date=end_date,
    )

    # --------------------------------------------------------
    # Update allowed fields
    # --------------------------------------------------------

    for key, value in update_data.items():

        if key == "title" and value is not None:
            value = value.strip()

        elif key == "category" and value is not None:
            value = value.strip()

        elif key == "description" and value is not None:
            value = value.strip()

        elif key == "responsibilities" and value:
            value = value.strip()

        elif key == "location" and value:
            value = value.strip()

        elif key == "requirements" and value:
            value = value.strip()

        elif (
            key == "compensation_description"
            and value
        ):
            value = value.strip()

        setattr(
            campaign,
            key,
            value,
        )

    db.commit()
    db.refresh(campaign)

    return _campaign_to_response(
        db,
        campaign,
    )


# ============================================================
# PUBLISH CAMPAIGN
# ============================================================

@router.put(
    "/{campaign_id}/publish",
    response_model=CampaignResponse,
)
async def publish_campaign(
    campaign_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_business),
):
    """
    Publish a draft campaign.

    Publishing no longer depends on the old funding system.
    """

    campaign = (
        db.query(Campaign)
        .filter(Campaign.id == campaign_id)
        .first()
    )

    if not campaign:
        raise HTTPException(
            status_code=404,
            detail="Campaign not found.",
        )

    if campaign.business_id != current_user.id:
        raise HTTPException(
            status_code=403,
            detail="Access denied.",
        )

    if campaign.status != CampaignStatus.DRAFT:
        raise HTTPException(
            status_code=400,
            detail="Only draft campaigns can be published.",
        )

    # --------------------------------------------------------
    # Required campaign information
    # --------------------------------------------------------

    if not campaign.title.strip():
        raise HTTPException(
            status_code=400,
            detail="Campaign title is required.",
        )

    if not campaign.category:
        raise HTTPException(
            status_code=400,
            detail="Campaign category is required.",
        )

    if not campaign.description.strip():
        raise HTTPException(
            status_code=400,
            detail="Campaign description is required.",
        )

    if not campaign.creator_types:
        raise HTTPException(
            status_code=400,
            detail="At least one creator type is required.",
        )

    if not campaign.deliverables:
        raise HTTPException(
            status_code=400,
            detail="At least one deliverable is required.",
        )

    if not campaign.engagement_type:
        raise HTTPException(
            status_code=400,
            detail="Engagement type is required.",
        )

    if not campaign.pricing_model:
        raise HTTPException(
            status_code=400,
            detail="Pricing model is required.",
        )

    _validate_campaign_dates(
        application_deadline=campaign.application_deadline,
        start_date=campaign.start_date,
        end_date=campaign.end_date,
    )

    campaign.status = CampaignStatus.PUBLISHED
    campaign.is_active = True

    db.commit()
    db.refresh(campaign)

    return _campaign_to_response(
        db,
        campaign,
    )


# ============================================================
# DUPLICATE CAMPAIGN
# ============================================================

@router.post(
    "/{campaign_id}/duplicate",
    response_model=CampaignResponse,
)
async def duplicate_campaign(
    campaign_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_business),
):
    """
    Duplicate a campaign as a new draft.

    Only campaign information is copied.
    Applications and lifecycle state are not copied.
    """

    original = (
        db.query(Campaign)
        .filter(Campaign.id == campaign_id)
        .first()
    )

    if not original:
        raise HTTPException(
            status_code=404,
            detail="Campaign not found.",
        )

    if original.business_id != current_user.id:
        raise HTTPException(
            status_code=403,
            detail="Access denied.",
        )

    duplicate = Campaign(
        business_id=current_user.id,

        title=f"{original.title} - Copy",
        category=original.category,
        description=original.description,

        responsibilities=original.responsibilities,

        creator_types=original.creator_types,
        experience_level=original.experience_level,
        required_skills=original.required_skills,
        location=original.location,
        work_arrangement=original.work_arrangement,
        requirements=original.requirements,

        deliverables=original.deliverables,
        creators_needed=original.creators_needed,

        engagement_type=original.engagement_type,
        duration=original.duration,

        pricing_model=original.pricing_model,
        compensation_type=original.compensation_type,
        budget=original.budget,
        budget_min=original.budget_min,
        budget_max=original.budget_max,
        compensation_description=(
            original.compensation_description
        ),

        # Timeline intentionally reset.
        start_date=None,
        end_date=None,
        application_deadline=None,

        application_questions=(
            original.application_questions
        ),

        hero_image=original.hero_image,

        status=CampaignStatus.DRAFT,
        is_active=True,
    )

    db.add(duplicate)
    db.commit()
    db.refresh(duplicate)

    duplicate.application_count = 0

    return duplicate


# ============================================================
# CLOSE CAMPAIGN
# ============================================================

@router.put(
    "/{campaign_id}/close",
    response_model=CampaignResponse,
)
async def close_campaign(
    campaign_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_business),
):
    """
    Close a campaign so it is no longer visible in the marketplace.
    """

    campaign = (
        db.query(Campaign)
        .filter(
            Campaign.id == campaign_id,
            Campaign.business_id == current_user.id,
        )
        .first()
    )

    if not campaign:
        raise HTTPException(
            status_code=404,
            detail="Campaign not found.",
        )

    if campaign.status == CampaignStatus.COMPLETED:
        raise HTTPException(
            status_code=400,
            detail="Completed campaigns are already closed.",
        )

    campaign.status = CampaignStatus.CLOSED
    campaign.is_active = False

    db.commit()
    db.refresh(campaign)

    return _campaign_to_response(
        db,
        campaign,
    )


# ============================================================
# DELETE DRAFT
# ============================================================

@router.delete(
    "/{campaign_id}",
)
async def delete_campaign(
    campaign_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Permanently delete a draft campaign that has no applications.
    """

    campaign = (
        db.query(Campaign)
        .filter(Campaign.id == campaign_id)
        .first()
    )

    if not campaign:
        raise HTTPException(
            status_code=404,
            detail="Campaign not found.",
        )

    if (
        campaign.business_id != current_user.id
        and current_user.role != "admin"
    ):
        raise HTTPException(
            status_code=403,
            detail="Access denied.",
        )

    if campaign.status != CampaignStatus.DRAFT:
        raise HTTPException(
            status_code=400,
            detail=(
                "Only draft campaigns can be permanently deleted. "
                "Close or complete active campaigns instead."
            ),
        )

    application_count = _application_count(
        db,
        campaign.id,
    )

    if application_count > 0:
        raise HTTPException(
            status_code=400,
            detail=(
                "This campaign has application history "
                "and cannot be deleted."
            ),
        )

    db.delete(campaign)
    db.commit()

    return {
        "message": "Draft campaign deleted successfully."
    }