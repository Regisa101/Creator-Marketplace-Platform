from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import BusinessProfile, Campaign, Application, Deliverable, User
from app.schemas.business import PublicBusinessProfile, BusinessWorkHistoryItem


router = APIRouter(
    prefix="/api/businesses",
    tags=["Businesses"],
)


@router.get(
    "/{business_id}/public-profile",
    response_model=PublicBusinessProfile,
)
async def get_public_business_profile(
    business_id: int,
    db: Session = Depends(get_db),
):
    """
    Public creator-facing business profile.

    Only businesses that have published their profile are visible.
    Private business information is intentionally excluded.
    """

    profile = (
        db.query(BusinessProfile)
        .filter(
            BusinessProfile.user_id == business_id,
            BusinessProfile.is_published.is_(True),
        )
        .first()
    )

    if not profile:
        raise HTTPException(
            status_code=404,
            detail="Business profile not found",
        )

    campaigns = (
        db.query(Campaign)
        .filter(
            Campaign.business_id == business_id,
            Campaign.status == "published",
            Campaign.is_active.is_(True),
        )
        .order_by(Campaign.created_at.desc())
        .all()
    )

    completed_apps = (
        db.query(Application)
        .join(Campaign, Campaign.id == Application.campaign_id)
        .filter(Application.creator_id.isnot(None), Campaign.business_id == business_id, Application.status == "completed")
        .order_by(Application.updated_at.desc())
        .all()
    )
    history = []
    creator_ids = set()
    for app in completed_apps:
        creator = db.query(User).filter(User.id == app.creator_id).first()
        campaign = db.query(Campaign).filter(Campaign.id == app.campaign_id).first()
        ds = db.query(Deliverable).filter(Deliverable.application_id == app.id).all()
        creator_ids.add(app.creator_id)
        history.append(BusinessWorkHistoryItem(
            application_id=app.id, campaign_id=app.campaign_id,
            campaign_title=campaign.title if campaign else "Campaign",
            creator_id=app.creator_id,
            creator_name=(creator.profile or {}).get("display_name") if creator and creator.profile else (creator.full_name if creator else None),
            completed_at=app.updated_at, deliverables=[d.title for d in ds]
        ))

    return {
        "id": profile.user_id,
        "company_name": profile.company_name,
        "business_type": profile.business_type,
        "industry": profile.industry,
        "location": profile.location,
        "website": profile.website,
        "description": profile.description,
        "logo_url": profile.logo_url,
        "interested_categories": profile.interested_categories or [],
        "preferred_content_types": profile.preferred_content_types or [],
        "team_size": profile.team_size,
        "year_established": profile.year_established,
        "is_onboarding_complete": bool(
            profile.is_onboarding_complete
        ),
        "is_published": bool(profile.is_published),
        "completed_collaborations": len(history),
        "creators_worked_with": len(creator_ids),
        "work_history": history,
        "campaigns": [
            {
                "id": campaign.id,
                "title": campaign.title,
                "category": campaign.category,
                "sub_category": campaign.sub_category,
                "campaign_type": (
                    campaign.campaign_type.value
                    if hasattr(campaign.campaign_type, "value")
                    else str(campaign.campaign_type)
                ),
                "status": (
                    campaign.status.value
                    if hasattr(campaign.status, "value")
                    else str(campaign.status)
                ),
            }
            for campaign in campaigns
        ],
    }