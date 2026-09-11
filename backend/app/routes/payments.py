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
    payment.status = "funded"
    payment.method = payment_method
    payment.transaction_id = payment.transaction_id or f"DEMO-{uuid4().hex[:12].upper()}"
    payment.paid_at = payment.paid_at or datetime.now(timezone.utc)
    if hasattr(payment, "payment_details"):
        payment.payment_details = metadata or {}

    application = db.query(Application).filter(Application.id == payment.application_id).first()
    campaign = db.query(Campaign).filter(Campaign.id == application.campaign_id).first() if application else None
    if application and campaign:
        create_notification(db,user_id=application.creator_id,type="payment_funded",title="Payment secured",message=f"Rs. {float(payment.amount):,.2f} is secured for {campaign.title} and will be released after verification.",link=f"/workspace/active?collab={application.id}",event_key=f"payment-funded:{payment.id}")
        create_notification(db,user_id=campaign.business_id,type="payment_funded",title="Payment secured",message=f"Rs. {float(payment.amount):,.2f} has been secured for {campaign.title}.",link=f"/workspace/active?collab={application.id}",event_key=f"payment-funded-business:{payment.id}")

        deliverables = db.query(Deliverable).filter(Deliverable.application_id == application.id).all()
        all_approved = bool(deliverables) and all(d.status == "approved" for d in deliverables)
        if getattr(application, "creator_verified", False) and all_approved:
            payment.status = "released"
            application.status = "completed"
            create_notification(db,user_id=application.creator_id,type="payment_released",title="Payment released",message=f"Rs. {float(payment.amount):,.2f} has been released for {campaign.title}.",link="/workspace/history",event_key=f"payment-released:{payment.id}")
            create_notification(db,user_id=campaign.business_id,type="collaboration_completed",title="Collaboration completed",message=f"{campaign.title} is complete. The creator verified the approved work and payment was released.",link="/workspace/history",event_key=f"collaboration-completed:{application.id}")

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
    if not getattr(application, "creator_confirmed", False):
        raise HTTPException(status_code=400, detail="The creator must confirm the collaboration before payment can be secured.")

    campaign = db.query(Campaign).filter(Campaign.id == application.campaign_id).first()
    if campaign and getattr(campaign.campaign_type, "value", str(campaign.campaign_type)) == "gifted":
        raise HTTPException(status_code=400, detail="Gifted collaborations do not require payment.")

    # Never accept a payment amount from the browser. The only payable amount
    # is the immutable, mutually agreed rate recorded on the application.
    if not application.rate_locked or application.agreed_rate is None:
        raise HTTPException(status_code=400, detail="Payment is unavailable until the payment amount has been agreed and locked.")
    amount = float(application.agreed_rate)
    if amount <= 0:
        raise HTTPException(status_code=400, detail="The agreed payment amount must be greater than zero.")

    latest_completed = db.query(Payment).filter(Payment.application_id == application.id, Payment.status.in_(["funded", "completed", "released"])).first()
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


@router.post("/release/{collab_id}", response_model=PaymentResponse)
async def release_payment(collab_id:int, db:Session=Depends(get_db), current_user:User=Depends(get_current_business)):
    application=_get_authorized_collab(db,current_user,collab_id)
    payment=db.query(Payment).filter(Payment.application_id==collab_id,Payment.status.in_(["funded","completed"])).order_by(Payment.created_at.desc()).first()
    if not payment: raise HTTPException(400,"No secured payment is available to release.")
    campaign=db.query(Campaign).filter(Campaign.id==application.campaign_id).first()
    ds=db.query(Deliverable).filter(Deliverable.application_id==application.id).all()
    if ds and not all(d.status=="approved" for d in ds): raise HTTPException(400,"All deliverables must be approved before payment release.")
    if not getattr(application, "creator_verified", False): raise HTTPException(400,"The creator must submit final verification before payment release.")
    if getattr(campaign,"completion_mode","approval_only")=="publication_required":
        from app.models import PublicationProof
        ps=db.query(PublicationProof).filter(PublicationProof.application_id==application.id).all()
        if not ps or not all(x.status=="verified" for x in ps): raise HTTPException(400,"Publication proof must be verified before payment release.")
    payment.status="released"; application.status="completed"
    create_notification(db,user_id=application.creator_id,type="payment_released",title="Payment released",message=f"Rs. {float(payment.amount):,.2f} has been released for {campaign.title}.",link="/workspace/history",event_key=f"payment-released:{payment.id}")
    create_notification(db,user_id=campaign.business_id,type="campaign_completed",title="Campaign completed",message=f"{campaign.title} is complete and the agreed payment of Rs. {float(payment.amount):,.2f} has been released.",link="/workspace/history",event_key=f"campaign-completed:{application.id}")
    from app.routes.workspace import _maybe_complete_campaign
    _maybe_complete_campaign(db, campaign)
    db.commit(); db.refresh(payment); return _payment_to_response(payment)

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
        .filter(Payment.status == "released")
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