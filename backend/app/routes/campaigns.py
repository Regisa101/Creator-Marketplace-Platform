from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import Optional

from app.database import get_db
from app.models import User, Campaign, Application
from app.schemas.campaign import CampaignCreate, CampaignUpdate, CampaignResponse
from app.dependencies.auth import get_current_user, get_current_business

router = APIRouter(prefix="/api/campaigns", tags=["Campaigns"])

@router.post("/", response_model=CampaignResponse)
async def create_campaign(
    data: CampaignCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_business)
):
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
        deadline=data.deadline,
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
        query = query.filter(Campaign.status == "published")
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
            "deadline": campaign.deadline,
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
    
    if current_user.role == "creator" and campaign.status != "published":
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
    
    if campaign.status == "in_progress":
        raise HTTPException(status_code=400, detail="Cannot delete active campaign")
    
    db.delete(campaign)
    db.commit()
    return {"message": "Campaign deleted successfully"}