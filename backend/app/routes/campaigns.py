from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from typing import Optional
from datetime import datetime, timezone, timedelta

from app.database import get_db
from app.models import User, Campaign, Application, Deliverable, Payment
from app.models.campaign import CampaignStatus
from app.schemas.campaign import CampaignCreate, CampaignUpdate, CampaignResponse
from app.dependencies.auth import get_current_user, get_current_business

router = APIRouter(prefix="/api/campaigns", tags=["Campaigns"])


def _validate_campaign_dates(application_deadline, deliverable_deadline):
    """Validate selected calendar dates, not a strict 24-hour window.

    A browser date input sends midnight for the selected day. Comparing that
    timestamp with `now + 1 day` incorrectly rejected a perfectly valid
    'tomorrow' selection later in the day. We therefore compare calendar
    dates in UTC and require tomorrow-or-later.
    """
    today = datetime.now(timezone.utc).date()
    tomorrow = today + timedelta(days=1)

    def as_date(value):
        if value is None:
            return None
        if value.tzinfo is None:
            return value.date()
        return value.astimezone(timezone.utc).date()

    app_date = as_date(application_deadline)
    deliverable_date = as_date(deliverable_deadline)

    if app_date is not None and app_date < tomorrow:
        raise HTTPException(status_code=400, detail="Application deadline must be tomorrow or later.")
    if deliverable_date is not None and deliverable_date < tomorrow:
        raise HTTPException(status_code=400, detail="Deliverable deadline must be tomorrow or later.")
    if app_date and deliverable_date and deliverable_date <= app_date:
        raise HTTPException(status_code=400, detail="Deliverable deadline must be after the application deadline.")


@router.post("/", response_model=CampaignResponse)
async def create_campaign(
    data: CampaignCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_business)
):
    _validate_campaign_dates(data.application_deadline or data.deadline, data.deliverable_deadline)

    campaign = Campaign(
        business_id=current_user.id,
        title=data.title,
        description=data.description,
        brief=data.brief,
        category=data.category,
        sub_category=data.sub_category,
        campaign_type=data.campaign_type.value if data.campaign_type else "gifted",
        brand_name=data.brand_name,
        brand_location=data.brand_location,
        budget=data.budget,
        compensation_description=data.compensation_description,
        requirements=data.requirements,
        creator_requirements=data.creator_requirements,
        deliverables=data.deliverables,
        before_you_apply=data.before_you_apply,
        checklist=[item.model_dump() for item in data.checklist] if data.checklist else None,
        required_scenes=data.required_scenes,
        video_specs=[spec.model_dump() for spec in data.video_specs] if data.video_specs else None,
        dos=data.dos,
        donts=data.donts,
        suggested_caption=data.suggested_caption,
        hashtags=data.hashtags,
        guidelines_note=data.guidelines_note,
        deadline=data.application_deadline or data.deadline,
        application_deadline=data.application_deadline or data.deadline,
        deliverable_deadline=data.deliverable_deadline,
        creators_needed=data.creators_needed,
        application_questions=data.application_questions,
        hero_image=data.hero_image,
        extra_photos=data.extra_photos,
        tagline=data.tagline
    )
    db.add(campaign)
    db.commit()
    db.refresh(campaign)
    return campaign


@router.post("/{campaign_id}/duplicate", response_model=CampaignResponse)
async def duplicate_campaign(
    campaign_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_business)
):
    """
    Creates a new draft campaign copied from an existing one.

    Copied: everything that describes what the campaign IS (title,
    category, requirements, checklist, dos/donts, video specs, etc.)

    NOT copied: id, created_at/updated_at (new row gets its own),
    status (always starts "draft" regardless of the original's status),
    applications (never touched — original's `applications` relationship
    is simply not referenced here), and deadline (a stale/passed
    deadline copied onto a brand-new draft is almost never useful —
    the business re-sets it when they actually publish).
    """
    original = db.query(Campaign).filter(Campaign.id == campaign_id).first()
    if not original:
        raise HTTPException(status_code=404, detail="Campaign not found")

    if original.business_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")

    duplicate = Campaign(
        business_id=current_user.id,
        title=f"{original.title} - Copy",
        tagline=original.tagline,
        description=original.description,
        brief=original.brief,
        category=original.category,
        sub_category=original.sub_category,
        campaign_type=original.campaign_type,
        brand_name=original.brand_name,
        brand_location=original.brand_location,
        budget=original.budget,
        compensation_description=original.compensation_description,
        requirements=original.requirements,
        creator_requirements=original.creator_requirements,
        deliverables=original.deliverables,
        before_you_apply=original.before_you_apply,
        checklist=original.checklist,
        required_scenes=original.required_scenes,
        video_specs=original.video_specs,
        dos=original.dos,
        donts=original.donts,
        suggested_caption=original.suggested_caption,
        hashtags=original.hashtags,
        guidelines_note=original.guidelines_note,
        hero_image=original.hero_image,
        extra_photos=original.extra_photos,
        status="draft",
        creators_needed=original.creators_needed,
        application_questions=original.application_questions,
        deliverable_deadline=None,
    )
    db.add(duplicate)
    db.commit()
    db.refresh(duplicate)
    duplicate.application_count = 0  # brand new campaign, no applications yet
    return duplicate


@router.get("/", response_model=dict)
async def get_campaigns(
    status: Optional[str] = None,
    category: Optional[str] = None,
    search: Optional[str] = None,
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=50),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(Campaign)
    
    if current_user.role == "creator":
        # The creator home is intentionally feed-like: posted campaigns remain visible
        # even after a creator is booked or the campaign is completed. Drafts stay private.
        query = query.filter(Campaign.status.in_([
            CampaignStatus.PUBLISHED,
            CampaignStatus.IN_PROGRESS,
            CampaignStatus.COMPLETED,
            CampaignStatus.CLOSED,
        ]))
    elif current_user.role == "business":
        query = query.filter(Campaign.business_id == current_user.id)
    
    if status:
        query = query.filter(Campaign.status == status)
    if category:
        query = query.filter(Campaign.category == category)
    if search:
        query = query.filter(
            Campaign.title.ilike(f"%{search}%") |
            Campaign.description.ilike(f"%{search}%")
        )
    
    total = query.count()
    offset = (page - 1) * limit
    campaigns = query.order_by(Campaign.created_at.desc()).offset(offset).limit(limit).all()
    
    # Build response with application_count
    result = []
    for campaign in campaigns:
        app_count = db.query(Application).filter(Application.campaign_id == campaign.id).count()
        # Convert to dict and add application_count
        campaign_dict = {
            "id": campaign.id,
            "business_id": campaign.business_id,
            "title": campaign.title,
            "tagline": campaign.tagline,
            "description": campaign.description,
            "brief": campaign.brief,
            "category": campaign.category,
            "sub_category": campaign.sub_category,
            "campaign_type": campaign.campaign_type,
            "brand_name": campaign.brand_name,
            "brand_location": campaign.brand_location,
            "budget": float(campaign.budget) if campaign.budget else None,
            "compensation_description": campaign.compensation_description,
            "requirements": campaign.requirements,
            "deliverables": campaign.deliverables,
            "before_you_apply": campaign.before_you_apply,
            "checklist": campaign.checklist,
            "required_scenes": campaign.required_scenes,
            "video_specs": campaign.video_specs,
            "dos": campaign.dos,
            "donts": campaign.donts,
            "suggested_caption": campaign.suggested_caption,
            "hashtags": campaign.hashtags,
            "guidelines_note": campaign.guidelines_note,
            "deadline": campaign.application_deadline or campaign.deadline,
            "application_deadline": campaign.application_deadline or campaign.deadline,
            "deliverable_deadline": campaign.deliverable_deadline,
            "creators_needed": campaign.creators_needed or 1,
            "application_questions": campaign.application_questions or [],
            "hero_image": campaign.hero_image,
            "extra_photos": campaign.extra_photos,
            "status": campaign.status,
            "is_active": campaign.is_active,
            "created_at": campaign.created_at,
            "updated_at": campaign.updated_at,
            "application_count": app_count
        }
        result.append(campaign_dict)
    
    return {
        "campaigns": result,
        "total": total,
        "page": page,
        "limit": limit,
        "pages": (total + limit - 1) // limit
    }


@router.get("/{campaign_id}", response_model=CampaignResponse)
async def get_campaign(
    campaign_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    campaign = db.query(Campaign).filter(Campaign.id == campaign_id).first()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    
    if current_user.role == "creator" and campaign.status == CampaignStatus.DRAFT:
        raise HTTPException(status_code=403, detail="Campaign not available")
    
    if current_user.role == "business" and campaign.business_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    app_count = db.query(Application).filter(Application.campaign_id == campaign.id).count()
    campaign.application_count = app_count
    
    return campaign


@router.put("/{campaign_id}", response_model=CampaignResponse)
async def update_campaign(
    campaign_id: int,
    data: CampaignUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_business)
):
    campaign = db.query(Campaign).filter(Campaign.id == campaign_id).first()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    
    if campaign.business_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    if campaign.status == "completed":
        raise HTTPException(status_code=400, detail="Cannot update completed campaign")
    
    update_data = data.model_dump(exclude_unset=True)
    app_deadline = update_data.get("application_deadline", campaign.application_deadline or campaign.deadline)
    deliverable_deadline = update_data.get("deliverable_deadline", campaign.deliverable_deadline)
    if "deadline" in update_data and "application_deadline" not in update_data:
        app_deadline = update_data["deadline"]
    _validate_campaign_dates(app_deadline, deliverable_deadline) if (app_deadline or deliverable_deadline) else None
    for key, value in update_data.items():
        if key == "campaign_type" and value:
            setattr(campaign, key, value.value)
        else:
            setattr(campaign, key, value)
    
    db.commit()
    db.refresh(campaign)
    return campaign


@router.put("/{campaign_id}/publish", response_model=CampaignResponse)
async def publish_campaign(
    campaign_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_business)
):
    campaign = db.query(Campaign).filter(Campaign.id == campaign_id).first()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    
    if campaign.business_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    if campaign.status != "draft":
        raise HTTPException(status_code=400, detail="Campaign is already published or in progress")
    
    _validate_campaign_dates(campaign.application_deadline or campaign.deadline, campaign.deliverable_deadline)
    campaign.application_deadline = campaign.application_deadline or campaign.deadline
    campaign.deadline = campaign.application_deadline
    campaign.status = "published"
    db.commit()
    db.refresh(campaign)
    return campaign


@router.delete("/{campaign_id}")
async def delete_campaign(
    campaign_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    campaign = db.query(Campaign).filter(Campaign.id == campaign_id).first()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    if campaign.business_id != current_user.id and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Access denied")

    application_count = db.query(Application).filter(Application.campaign_id == campaign.id).count()
    if application_count > 0:
        raise HTTPException(status_code=400, detail="This campaign has application or collaboration history and cannot be deleted. Close or complete it instead.")
    if campaign.status != "draft":
        raise HTTPException(status_code=400, detail="Only draft campaigns with no activity can be permanently deleted. Close active campaigns instead.")

    db.delete(campaign)
    db.commit()
    return {"message": "Draft campaign deleted successfully"}


@router.put("/{campaign_id}/close", response_model=CampaignResponse)
async def close_campaign(
    campaign_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_business),
):
    campaign = db.query(Campaign).filter(Campaign.id == campaign_id, Campaign.business_id == current_user.id).first()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    if campaign.status == "completed":
        raise HTTPException(status_code=400, detail="Completed campaigns are already closed.")
    campaign.status = "closed"
    campaign.is_active = False
    db.commit(); db.refresh(campaign)
    campaign.application_count = db.query(Application).filter(Application.campaign_id == campaign.id).count()
    return campaign
