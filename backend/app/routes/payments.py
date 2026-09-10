import time
from datetime import datetime, timezone
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, extract
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import User, Payment, Application, Deliverable, Campaign
from app.schemas.payment import PaymentInitiateRequest, PaymentInitiateResponse, PaymentResponse
from app.dependencies.auth import get_current_user, get_current_business
from app.core.config import FRONTEND_URL, PAYMENT_MODE
from app.services.khalti import initiate_payment, lookup_payment, KhaltiError
from app.services.notifications import create_notification
from app.routes.workspace import _get_authorized_collab

router = APIRouter(prefix="/api/payments", tags=["Payments"])

_STATUS_MAP = {
    "Completed": "completed",
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
        purchase_order_id=payment.purchase_order_id,
        pidx=payment.pidx,
        transaction_id=payment.transaction_id,
        amount=float(payment.amount),
        currency=payment.currency,
        status=payment.status,
        method=payment.method,
        paid_at=payment.paid_at,
        created_at=payment.created_at,
    )


def _complete_local_payment(db: Session, payment: Payment, payment_method: str = "demo_wallet", metadata: dict | None = None) -> Payment:
    payment.status = "completed"
    payment.method = payment_method
    payment.transaction_id = payment.transaction_id or f"DEMO-{uuid4().hex[:12].upper()}"
    payment.paid_at = payment.paid_at or datetime.now(timezone.utc)
    if hasattr(payment, "payment_details"):
        payment.payment_details = metadata or {}

    application = db.query(Application).filter(Application.id == payment.application_id).first()
    campaign = db.query(Campaign).filter(Campaign.id == application.campaign_id).first() if application else None
    if application and campaign:
        deliverables = db.query(Deliverable).filter(Deliverable.application_id == application.id).all()
        all_approved = (not deliverables) or all(d.status == "approved" for d in deliverables)
        if all_approved:
            application.status = "completed"
            create_notification(
                db, user_id=application.creator_id, type="payment_received",
                title="Payment received",
                message=f"You received Rs. {float(payment.amount):,.2f} for {campaign.title}.",
                link="/workspace/history",
                event_key=f"payment-received:{payment.id}",
            )
            create_notification(
                db, user_id=campaign.business_id, type="payment_completed",
                title="Payment completed",
                message=f"Your Rs. {float(payment.amount):,.2f} payment for {campaign.title} was recorded successfully.",
                link=f"/workspace/active",
                event_key=f"payment-completed-business:{payment.id}",
            )

            required = campaign.creators_needed or 1
            selected = db.query(Application).filter(
                Application.campaign_id == campaign.id,
                Application.status.in_(["accepted", "completed"]),
            ).all()
            completed_count = sum(1 for a in selected if a.status == "completed")
            if len(selected) >= required and completed_count >= required:
                campaign.status = "completed"
                campaign.is_active = False
                create_notification(
                    db, user_id=campaign.business_id, type="campaign_completed",
                    title="Campaign completed",
                    message=f"All creator collaborations for {campaign.title} are complete.",
                    link="/workspace/history",
                    event_key=f"campaign-completed:{campaign.id}",
                )

    db.commit()
    db.refresh(payment)
    return payment


@router.post("/initiate", response_model=PaymentInitiateResponse)
async def initiate(
    data: PaymentInitiateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_business),
):
    application = _get_authorized_collab(db, current_user, data.collab_id)
    if application.status != "accepted":
        raise HTTPException(status_code=400, detail="Only an active collaboration can be paid.")

    campaign = db.query(Campaign).filter(Campaign.id == application.campaign_id).first()
    if campaign and getattr(campaign.campaign_type, "value", str(campaign.campaign_type)) == "gifted":
        raise HTTPException(status_code=400, detail="Gifted collaborations do not require payment.")

    amount = data.amount if data.amount is not None else (float(application.rate) if application.rate is not None else None)
    if amount is None:
        raise HTTPException(status_code=400, detail="No rate is set for this collaboration — specify an amount to pay.")
    if amount <= 0:
        raise HTTPException(status_code=400, detail="Amount must be greater than zero")

    latest_completed = db.query(Payment).filter(Payment.application_id == application.id, Payment.status == "completed").first()
    if latest_completed:
        raise HTTPException(status_code=400, detail="This collaboration has already been paid.")

    purchase_order_id = f"APP{application.id}-{int(time.time())}-{uuid4().hex[:6].upper()}"
    payment = Payment(
        application_id=application.id,
        purchase_order_id=purchase_order_id,
        amount=amount,
        status="initiated",
        method="demo_wallet" if PAYMENT_MODE == "demo" else "khalti",
        initiated_by=current_user.id,
    )
    db.add(payment)
    db.commit()
    db.refresh(payment)

    if PAYMENT_MODE == "demo":
        demo_pidx = f"demo_{uuid4().hex}"
        payment.pidx = demo_pidx
        db.commit()
        return PaymentInitiateResponse(
            payment_url=f"{FRONTEND_URL}/payments/demo?pidx={demo_pidx}",
            pidx=demo_pidx,
            purchase_order_id=purchase_order_id,
        )

    business_profile = current_user.profile if isinstance(current_user.profile, dict) else {}
    business_name = business_profile.get("company_name") or current_user.full_name
    try:
        result = await initiate_payment(
            amount_npr=amount,
            purchase_order_id=purchase_order_id,
            purchase_order_name=f"Collab payment — application #{application.id}",
            return_url=f"{FRONTEND_URL}/payments/return",
            website_url=FRONTEND_URL,
            customer_name=business_name,
            customer_email=current_user.email,
        )
    except KhaltiError as e:
        payment.status = "failed"
        db.commit()
        raise HTTPException(status_code=502, detail=f"Could not start payment: {e.detail or str(e)}")

    payment.pidx = result["pidx"]
    db.commit()
    return PaymentInitiateResponse(payment_url=result["payment_url"], pidx=result["pidx"], purchase_order_id=purchase_order_id)


@router.post("/demo/complete", response_model=PaymentResponse)
async def complete_demo_payment(
    pidx: str = Query(...),
    method: str = Query("demo_wallet"),
    account_name: str | None = Query(None),
    reference_note: str | None = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_business),
):
    if PAYMENT_MODE != "demo":
        raise HTTPException(status_code=404, detail="Demo payments are disabled.")
    payment = db.query(Payment).filter(Payment.pidx == pidx).first()
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")
    _get_authorized_collab(db, current_user, payment.application_id)
    if payment.status == "completed":
        return _payment_to_response(payment)
    if method not in ("demo_wallet", "demo_bank"):
        raise HTTPException(status_code=400, detail="Invalid demo payment method.")
    metadata = {"account_name": account_name or "", "reference_note": reference_note or ""}
    return _payment_to_response(_complete_local_payment(db, payment, method, metadata))


@router.get("/verify", response_model=PaymentResponse)
async def verify(
    pidx: str = Query(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    payment = db.query(Payment).filter(Payment.pidx == pidx).first()
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")
    _get_authorized_collab(db, current_user, payment.application_id)
    if PAYMENT_MODE == "demo":
        return _payment_to_response(payment)

    try:
        result = await lookup_payment(pidx)
    except KhaltiError as e:
        raise HTTPException(status_code=502, detail=f"Could not verify payment: {e}")

    payment.status = _STATUS_MAP.get(result.get("status"), "failed")
    payment.transaction_id = result.get("transaction_id")
    if payment.status == "completed" and payment.paid_at is None:
        payment.paid_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(payment)
    return _payment_to_response(payment)


@router.get("/by-collab/{collab_id}", response_model=list[PaymentResponse])
async def list_for_collab(collab_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    _get_authorized_collab(db, current_user, collab_id)
    payments = db.query(Payment).filter(Payment.application_id == collab_id).order_by(Payment.created_at.desc()).all()
    return [_payment_to_response(p) for p in payments]


@router.get("/summary")
async def payment_summary(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    now = datetime.now(timezone.utc)
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

    base_query = (
        db.query(Payment)
        .join(Application, Payment.application_id == Application.id)
        .join(Campaign, Application.campaign_id == Campaign.id)
        .filter(Payment.status == "completed")
    )
    if current_user.role == "creator":
        base_query = base_query.filter(Application.creator_id == current_user.id)
    else:
        base_query = base_query.filter(Campaign.business_id == current_user.id)

    lifetime_total = float(base_query.with_entities(func.coalesce(func.sum(Payment.amount), 0)).scalar() or 0)

    month_query = base_query.filter(Payment.paid_at >= month_start)
    month_total = float(month_query.with_entities(func.coalesce(func.sum(Payment.amount), 0)).scalar() or 0)
    month_count = int(month_query.count())

    return {
        "role": current_user.role,
        "this_month": month_total,
        "lifetime": lifetime_total,
        "completed_payment_count": month_count,
    }