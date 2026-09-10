from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import User, Campaign, Application, Payment, CampaignPerformance
from app.schemas.campaign_performance import CampaignPerformanceUpdate, CampaignPerformanceResponse
from app.dependencies.auth import get_current_business
from app.services.notifications import create_notification

router = APIRouter(prefix="/api/campaign-performance", tags=["Campaign Performance"])


def _owner_campaign(db: Session, user: User, campaign_id: int) -> Campaign:
    campaign = db.query(Campaign).filter(Campaign.id == campaign_id, Campaign.business_id == user.id).first()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    return campaign


def _build_response(db: Session, campaign: Campaign, row: CampaignPerformance | None) -> CampaignPerformanceResponse:
    spend = float(db.query(func.coalesce(func.sum(Payment.amount), 0)).join(Application, Payment.application_id == Application.id).filter(
        Application.campaign_id == campaign.id,
        Payment.status.in_(["funded", "released", "completed"]),
    ).scalar() or 0)
    revenue = float(row.revenue) if row else 0
    other_costs = float(row.other_costs) if row else 0
    total_cost = spend + other_costs
    profit = revenue - total_cost
    roi = (profit / total_cost * 100) if total_cost > 0 else 0
    return CampaignPerformanceResponse(
        id=row.id if row else None, campaign_id=campaign.id, campaign_title=campaign.title,
        creator_spend=round(spend, 2), revenue=round(revenue, 2), other_costs=round(other_costs, 2),
        total_cost=round(total_cost, 2), estimated_profit=round(profit, 2), roi_percent=round(roi, 2),
        sales_count=row.sales_count if row else None, reach=row.reach if row else None,
        engagement=row.engagement if row else None, notes=row.notes if row else None,
        created_at=row.created_at if row else None, updated_at=row.updated_at if row else None,
    )


@router.get("", response_model=list[CampaignPerformanceResponse])
async def list_performance(db: Session = Depends(get_db), current_user: User = Depends(get_current_business)):
    campaigns = db.query(Campaign).filter(Campaign.business_id == current_user.id).order_by(Campaign.created_at.desc()).all()
    return [_build_response(db, c, db.query(CampaignPerformance).filter(CampaignPerformance.campaign_id == c.id).first()) for c in campaigns]


@router.get("/{campaign_id}", response_model=CampaignPerformanceResponse)
async def get_performance(campaign_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_business)):
    campaign = _owner_campaign(db, current_user, campaign_id)
    row = db.query(CampaignPerformance).filter(CampaignPerformance.campaign_id == campaign.id).first()
    return _build_response(db, campaign, row)


@router.put("/{campaign_id}", response_model=CampaignPerformanceResponse)
async def update_performance(campaign_id: int, data: CampaignPerformanceUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_business)):
    campaign = _owner_campaign(db, current_user, campaign_id)
    row = db.query(CampaignPerformance).filter(CampaignPerformance.campaign_id == campaign.id).first()
    if row is None:
        row = CampaignPerformance(campaign_id=campaign.id)
        db.add(row)
    row.revenue = data.revenue
    row.other_costs = data.other_costs
    row.sales_count = data.sales_count
    row.reach = data.reach
    row.engagement = data.engagement
    row.notes = data.notes
    db.flush()
    result = _build_response(db, campaign, row)
    create_notification(db, user_id=current_user.id, type="campaign_performance_updated", title="Campaign results updated", message=f"Performance for {campaign.title} is now {result.roi_percent:.1f}% ROI.", link=f"/analytics", reference_id=campaign.id, event_key=f"performance-updated:{campaign.id}:{datetime.now(timezone.utc).isoformat()}")
    db.commit()
    db.refresh(row)
    return _build_response(db, campaign, row)
