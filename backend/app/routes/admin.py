from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies.auth import get_current_admin
from app.models import User, Campaign, Application, Payment

router = APIRouter(prefix="/api/admin", tags=["Admin"])


@router.get("/overview")
async def admin_overview(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin),
):
    now = datetime.now(timezone.utc)
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

    total_revenue = float(db.query(func.coalesce(func.sum(Payment.amount), 0)).filter(
        Payment.payment_type == "selection_fee",
        Payment.status.in_(["funded", "completed"]),
    ).scalar() or 0)
    month_revenue = float(db.query(func.coalesce(func.sum(Payment.amount), 0)).filter(
        Payment.payment_type == "selection_fee",
        Payment.status.in_(["funded", "completed"]),
        Payment.paid_at >= month_start,
    ).scalar() or 0)

    return {
        "users": {
            "total": db.query(User).count(),
            "creators": db.query(User).filter(User.role == "creator").count(),
            "businesses": db.query(User).filter(User.role == "business").count(),
            "admins": db.query(User).filter(User.role == "admin").count(),
        },
        "campaigns": {
            "total": db.query(Campaign).count(),
            "open": db.query(Campaign).filter(Campaign.status == "published", Campaign.is_active.is_(True)).count(),
            "closed": db.query(Campaign).filter(Campaign.status == "closed").count(),
            "completed": db.query(Campaign).filter(Campaign.status == "completed").count(),
        },
        "applications": {
            "total": db.query(Application).count(),
            "pending": db.query(Application).filter(Application.status == "pending").count(),
            "selected": db.query(Application).filter(Application.status == "accepted").count(),
            "rejected": db.query(Application).filter(Application.status == "rejected").count(),
        },
        "revenue": {
            "total": total_revenue,
            "this_month": month_revenue,
            "transactions": db.query(Payment).filter(
                Payment.payment_type == "selection_fee",
                Payment.status.in_(["funded", "completed"]),
            ).count(),
        },
    }


@router.get("/payments")
async def admin_payments(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin),
):
    rows = db.query(Payment).filter(
        Payment.payment_type == "selection_fee",
    ).order_by(Payment.created_at.desc()).limit(100).all()

    result = []
    for payment in rows:
        application = db.query(Application).filter(Application.id == payment.application_id).first()
        campaign = db.query(Campaign).filter(Campaign.id == payment.campaign_id).first()
        creator = db.query(User).filter(User.id == application.creator_id).first() if application else None
        business = db.query(User).filter(User.id == campaign.business_id).first() if campaign else None
        result.append({
            "id": payment.id,
            "amount": float(payment.amount),
            "platform_revenue": float(payment.platform_fee or payment.amount),
            "status": payment.status,
            "created_at": payment.created_at,
            "paid_at": payment.paid_at,
            "campaign_id": payment.campaign_id,
            "campaign_title": campaign.title if campaign else None,
            "creator_name": creator.full_name if creator else None,
            "business_name": business.full_name if business else None,
            "transaction_id": payment.transaction_id,
        })
    return result
