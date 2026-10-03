from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Application, BusinessProfile, Campaign, CreatorProfile, User
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

    # Creators this brand has accepted / completed work with.
    campaign_titles = {
        c.id: c.title
        for c in db.query(Campaign).filter(Campaign.business_id == business_id).all()
    }
    applications = []
    if campaign_titles:
        applications = (
            db.query(Application)
            .filter(
                Application.campaign_id.in_(list(campaign_titles.keys())),
                Application.status.in_(["accepted", "completed"]),
            )
            .order_by(Application.updated_at.desc().nullslast(), Application.created_at.desc())
            .all()
        )

    work_history = []
    for app in applications:
        creator_user = db.query(User).filter(User.id == app.creator_id).first()
        creator_profile = (
            db.query(CreatorProfile).filter(CreatorProfile.user_id == app.creator_id).first()
        )
        work_history.append(
            {
                "application_id": app.id,
                "campaign_id": app.campaign_id,
                "campaign_title": campaign_titles.get(app.campaign_id, "Campaign"),
                "creator_id": app.creator_id,
                "creator_name": (
                    (creator_profile.display_name if creator_profile else None)
                    or (creator_user.full_name if creator_user else None)
                ),
                "creator_avatar": creator_profile.profile_image if creator_profile else None,
                "status": app.status,
                "completed_at": app.updated_at if app.status == "completed" else None,
                "deliverables": [],
            }
        )

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
        "typical_budget": float(profile.typical_budget) if profile.typical_budget is not None else None,
        "completed_collaborations": sum(1 for a in applications if a.status == "completed"),
        "creators_worked_with": len({a.creator_id for a in applications}),
        "work_history": work_history,
        "campaigns": [
            {
                "id": campaign.id,
                "title": campaign.title,
                "category": campaign.category,
                "status": campaign.status.value if hasattr(campaign.status, "value") else str(campaign.status),
                "hero_image": campaign.hero_image,
                "budget": float(campaign.budget) if campaign.budget is not None else None,
                "campaign_type": getattr(campaign, "campaign_type", None),
            }
            for campaign in campaigns
        ],
    }