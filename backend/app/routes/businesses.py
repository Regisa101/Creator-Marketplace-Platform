from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import BusinessProfile, Campaign
from app.schemas.business import PublicBusinessProfile

router = APIRouter(prefix="/api/businesses", tags=["Businesses"])


@router.get("/{business_id}/public-profile", response_model=PublicBusinessProfile)
async def get_public_business_profile(business_id: int, db: Session = Depends(get_db)):
    profile = db.query(BusinessProfile).filter(
        BusinessProfile.user_id == business_id,
        BusinessProfile.is_published.is_(True),
    ).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Business profile not found")

    campaigns = db.query(Campaign).filter(
        Campaign.business_id == business_id,
        Campaign.status == "published",
        Campaign.is_active.is_(True),
    ).order_by(Campaign.created_at.desc()).all()

    return {
        "id": profile.user_id,
        "company_name": profile.company_name,
        "business_type": profile.business_type,
        "industry": profile.industry,
        "location": profile.location,
        "website": profile.website,
        "social_links": profile.social_links or {},
        "description": profile.description,
        "logo_url": profile.logo_url,
        "interested_categories": profile.interested_categories or [],
        "preferred_content_types": profile.preferred_content_types or [],
        "team_size": profile.team_size,
        "year_established": profile.year_established,
        "is_onboarding_complete": bool(profile.is_onboarding_complete),
        "is_published": bool(profile.is_published),
        "completed_collaborations": 0,
        "creators_worked_with": 0,
        "work_history": [],
        "campaigns": [
            {
                "id": campaign.id,
                "title": campaign.title,
                "category": campaign.category,
                "status": campaign.status.value if hasattr(campaign.status, "value") else str(campaign.status),
            }
            for campaign in campaigns
        ],
    }
