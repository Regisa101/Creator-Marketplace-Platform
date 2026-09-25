from __future__ import annotations

from datetime import datetime, timezone
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies.auth import get_current_business, get_current_user
from app.models import User, Payment, Application, Campaign
from app.schemas.payment import PaymentResponse
from app.services.khalti import lookup_payment, KhaltiError
from app.services.notifications import create_notification

router = APIRouter(prefix="/api/payments", tags=["Payments"])

_STATUS_MAP = {
    "Completed": "funded",
    "Pending": "initiated",
    "Initiated": "initiated",
    "Refunded": "refunded",
    "Partially Refunded": "refunded",
    "Expired": "failed",
    "User canceled": "failed",
}


def _payment_to_response(payment: Payment) -> PaymentResponse:
    return PaymentResponse(
        id=payment.id,
        application_id=payment.application_id,
        campaign_id=payment.campaign_id,
        payment_type=payment.payment_type,
        purchase_order_id=payment.purchase_order_id,
        pidx=payment.pidx,
        transaction_id=payment.transaction_id,
        amount=float(payment.amount),
        platform_fee=float(payment.platform_fee) if payment.platform_fee is not None else None,
        creator_payout=float(payment.creator_payout) if payment.creator_payout is not None else None,
        currency=payment.currency,
        status=payment.status,
        method=payment.method,
        paid_at=payment.paid_at,
        created_at=payment.created_at,
    )


def _authorized_selection_payment(db: Session, current_user: User, pidx: str) -> Payment:
    payment = db.query(Payment).filter(Payment.pidx == pidx).first()
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found.")
    if payment.payment_type != "selection_fee":
        raise HTTPException(status_code=400, detail="This payment is not a creator selection payment.")
    application = db.query(Application).filter(Application.id == payment.application_id).first()
    campaign = db.query(Campaign).filter(Campaign.id == payment.campaign_id).first()
    if not application or not campaign or campaign.business_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied.")
    return payment

def _finalize_selection(db: Session, payment: Payment, method: str, metadata: dict | None = None) -> Payment:
    application = db.query(Application).filter(Application.id == payment.application_id).first()
    campaign = db.query(Campaign).filter(Campaign.id == payment.campaign_id).first()
    if not application or not campaign:
        raise HTTPException(status_code=404, detail="Selection record not found.")

    if payment.status in ("funded", "completed") and application.status == "accepted":
        return payment

    payment.status = "funded"
    payment.method = method

    # The amount stored on the payment is the total charged to the brand.
    # CreatorHub keeps 10% and the creator's payout is the remaining 90%.
    total_amount = float(payment.amount)
    platform_fee = round(total_amount * 0.10, 2)
    creator_payout = round(total_amount - platform_fee, 2)
    payment.platform_fee = platform_fee
    payment.creator_payout = creator_payout
    payment.transaction_id = payment.transaction_id or f"PAY-{uuid4().hex[:12].upper()}"
    payment.paid_at = payment.paid_at or datetime.now(timezone.utc)

    details = payment.payment_details if isinstance(payment.payment_details, dict) else {}
    details.update(metadata or {})
    details["platform_fee_rate"] = 0.10
    details["platform_fee"] = platform_fee
    details["creator_payout"] = creator_payout
    payment.payment_details = details

    application.status = "accepted"
    application.agreed_rate = float(payment.amount)
    application.rate = float(payment.amount)
    application.rate_locked = 1

    campaign.status = "closed"
    campaign.is_active = False

    other_pending = db.query(Application).filter(
        Application.campaign_id == campaign.id,
        Application.id != application.id,
        Application.status.in_(["pending", "payment_pending"]),
    ).all()
    for other in other_pending:
        other.status = "rejected"
        create_notification(
            db,
            user_id=other.creator_id,
            type="application_rejected",
            title="Campaign closed",
            message=f"The creator for {campaign.title} has been selected. Your application was not selected.",
            link="/applications",
            reference_id=other.id,
            event_key=f"application-rejected-closed:{other.id}",
        )

        create_notification(
        db,
        user_id=application.creator_id,
        type="creator_selected",
        title="You were selected! 🎉",
        message=f"The brand selected you for {campaign.title}. Your application has been confirmed.",
        link=f"/campaigns/{campaign.id}",
        reference_id=application.id,
        event_key=f"creator-selected:{application.id}",
    )
    create_notification(
        db,
        user_id=campaign.business_id,
        type="selection_payment_completed",
        title="Creator selected",
        message=f"Payment was completed and {application.creator.profile.get('display_name') if application.creator and application.creator.profile else application.creator.full_name if application.creator else 'the creator'} was selected for {campaign.title}.",
        link=f"/applications?campaign={campaign.id}",
        reference_id=application.id,
        event_key=f"selection-payment-completed:{application.id}",
    )

    db.commit()
    db.refresh(payment)
    return payment

@router.get("/verify", response_model=PaymentResponse)
async def verify_payment(
    pidx: str = Query(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_business),
):
    payment = _authorized_selection_payment(db, current_user, pidx)
    try:
        result = await lookup_payment(pidx)
    except KhaltiError as exc:
        raise HTTPException(status_code=502, detail=f"Could not verify payment: {exc.detail or str(exc)}")

    payment.status = _STATUS_MAP.get(result.get("status"), "failed")
    payment.transaction_id = result.get("transaction_id")
    if payment.status == "failed":
        application = db.query(Application).filter(Application.id == payment.application_id).first()
        if application and application.status == "payment_pending":
            application.status = "pending"
    db.commit()

    if payment.status == "funded":
        payment = _finalize_selection(db, payment, "khalti", {"provider_status": result.get("status")})

    return _payment_to_response(payment)


@router.get("/summary")
async def payment_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    base = db.query(Payment).filter(
        Payment.payment_type == "selection_fee",
        Payment.status.in_(["funded", "completed"]),
    )
    if current_user.role == "business":
        base = base.filter(Payment.initiated_by == current_user.id)
    elif current_user.role == "creator":
        base = base.join(Application, Payment.application_id == Application.id).filter(Application.creator_id == current_user.id)
    elif current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Access denied.")

    if current_user.role == "creator":
        lifetime = float(base.with_entities(func.coalesce(func.sum(Payment.creator_payout), 0)).scalar() or 0)
    else:
        lifetime = float(base.with_entities(func.coalesce(func.sum(Payment.amount), 0)).scalar() or 0)

    return {
        "role": current_user.role,
        "this_month": lifetime,
        "lifetime": lifetime,
        "completed_payment_count": base.count(),
    }


@router.get("/by-collab/{collab_id}", response_model=list[PaymentResponse])
async def list_for_collab(
    collab_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_business),
):
    application = db.query(Application).filter(Application.id == collab_id).first()
    if not application:
        raise HTTPException(status_code=404, detail="Application not found.")
    campaign = db.query(Campaign).filter(Campaign.id == application.campaign_id).first()
    if not campaign or campaign.business_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied.")
    payments = db.query(Payment).filter(Payment.application_id == collab_id).order_by(Payment.created_at.desc()).all()
    return [_payment_to_response(p) for p in payments]
