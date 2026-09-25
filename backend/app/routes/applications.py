from __future__ import annotations

import time
from datetime import datetime, timezone
from typing import Optional
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies.auth import get_current_business, get_current_creator, get_current_user
from app.models import User, Campaign, Application, Payment
from app.models.campaign import CampaignStatus
from app.schemas.application import ApplicationCreate, ApplicationResponse, ApplicationUpdate
from app.core.config import FRONTEND_URL
from app.services.khalti import initiate_payment, KhaltiError
from app.services.notifications import create_notification

router = APIRouter(prefix="/api/applications", tags=["Applications"])


def _creator_name(app: Application) -> str | None:
    if app.creator and app.creator.role == "creator":
        profile = app.creator.profile or {}
        return profile.get("display_name") or app.creator.full_name
    return app.creator.full_name if app.creator else None


def _creator_avatar(app: Application) -> str | None:
    if app.creator and app.creator.role == "creator":
        return (app.creator.profile or {}).get("profile_image")
    return None


PLATFORM_FEE_RATE = 0.10
TERM_DEFAULTS = {
    "one-time": 500.0,
    "onetime": 500.0,
    "one time": 500.0,
    "monthly": 2000.0,
    "month": 2000.0,
    "long-term": 5000.0,
    "long term": 5000.0,
    "yearly": 5000.0,
    "yearly long-term": 5000.0,
    "yearly long term": 5000.0,
}


def _campaign_budget(campaign: Campaign) -> float:
    """Return the total amount charged to the brand for one creator selection.

    A custom campaign budget is used when present. If the brand did not enter a
    positive budget, use the fixed default for the selected pricing term.
    """
    if campaign.budget is not None and float(campaign.budget) > 0:
        return round(float(campaign.budget), 2)

    # A budget range has no single amount, so the published maximum becomes
    # the payment amount when the brand selects a creator. This keeps the
    # payment deterministic because there is no negotiation step.
    if getattr(campaign, "budget_max", None) is not None and float(campaign.budget_max) > 0:
        return round(float(campaign.budget_max), 2)

    # pricing_model may be the UI choice "CreatorHub standard rate", so the
    # actual term must come from engagement_type. Check both fields for
    # compatibility with older campaigns.
    raw_values = [
        str(campaign.engagement_type or "").strip().lower(),
        str(campaign.pricing_model or "").strip().lower(),
    ]
    for raw_model in raw_values:
        for key, value in TERM_DEFAULTS.items():
            if key in raw_model:
                return value

    raise HTTPException(
        status_code=400,
        detail="This campaign needs a budget or a supported pricing term (One-time, Monthly, or Long-term/Yearly).",
    )


def _payment_breakdown(amount: float) -> tuple[float, float]:
    platform_fee = round(amount * PLATFORM_FEE_RATE, 2)
    creator_payout = round(amount - platform_fee, 2)
    return platform_fee, creator_payout


def _pricing_basis(campaign: Campaign) -> str:
    if campaign.budget is not None and float(campaign.budget) > 0:
        return "custom_budget"
    if getattr(campaign, "budget_max", None) is not None and float(campaign.budget_max) > 0:
        return "budget_range_max"
    return "creatorhub_standard_rate"


def _response(app: Application, campaign: Campaign | None = None) -> ApplicationResponse:
    return ApplicationResponse(
        id=app.id,
        campaign_id=app.campaign_id,
        creator_id=app.creator_id,
        proposal=app.proposal or "Application submitted",
        rate=float(app.rate) if app.rate is not None else None,
        message=app.message,
        application_answers=app.application_answers or [],
        selected_portfolio=app.selected_portfolio or [],
        creator_name=_creator_name(app),
        creator_avatar=_creator_avatar(app),
        campaign_title=campaign.title if campaign else (app.campaign.title if app.campaign else None),
        campaign_budget=float(campaign.budget) if campaign and campaign.budget is not None else None,
        creators_needed=campaign.creators_needed if campaign else None,
        agreed_rate=float(app.agreed_rate) if app.agreed_rate is not None else None,
        rate_locked=bool(app.rate_locked),
        status=app.status,
        created_at=app.created_at,
        updated_at=app.updated_at,
    )



@router.post("", response_model=ApplicationResponse)
async def create_application(
    data: ApplicationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_creator),
):
    campaign = db.query(Campaign).filter(Campaign.id == data.campaign_id).first()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found.")

    if campaign.status != CampaignStatus.PUBLISHED or not campaign.is_active:
        raise HTTPException(status_code=400, detail="This campaign is no longer accepting applications.")

    if campaign.application_deadline:
        deadline = campaign.application_deadline
        if deadline.tzinfo is None:
            deadline = deadline.replace(tzinfo=timezone.utc)
        if datetime.now(timezone.utc) > deadline:
            raise HTTPException(status_code=400, detail="The application deadline has passed.")

    existing = db.query(Application).filter(
        Application.campaign_id == campaign.id,
        Application.creator_id == current_user.id,
        Application.status.notin_(["withdrawn", "rejected"]),
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="You have already applied to this campaign.")

    answers = data.application_answers or []
    questions = [str(q).strip() for q in (campaign.application_questions or []) if str(q).strip()]
    answer_by_question = {str(item.get("question", "")).strip(): str(item.get("answer", "")).strip() for item in answers if isinstance(item, dict)}
    missing = [q for q in questions if not answer_by_question.get(q)]
    if missing:
        raise HTTPException(status_code=400, detail="Please answer every screening question before applying.")

    selected = data.selected_portfolio or []
    if len(selected) != 1:
        raise HTTPException(status_code=400, detail="Please submit exactly one work image with your application.")
    item = selected[0] if isinstance(selected[0], dict) else {}
    if not str(item.get("media_url", "")).strip():
        raise HTTPException(status_code=400, detail="The work image is required.")

    application = Application(
        campaign_id=campaign.id,
        creator_id=current_user.id,
        proposal=(data.proposal or "Application submitted").strip() or "Application submitted",
        rate=_campaign_budget(campaign),
        agreed_rate=_campaign_budget(campaign),
        rate_locked=1,
        message=data.message,
        application_answers=[{"question": q, "answer": answer_by_question[q]} for q in questions],
        selected_portfolio=[item],
        status="pending",
    )
    db.add(application)
    db.flush()


@router.get("", response_model=list[ApplicationResponse])
async def get_applications(
    campaign_id: Optional[int] = Query(None),
    status: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = db.query(Application)

    if current_user.role == "creator":
        query = query.filter(Application.creator_id == current_user.id)
    elif current_user.role == "business":
        campaign_ids = db.query(Campaign.id).filter(Campaign.business_id == current_user.id).subquery()
        query = query.filter(Application.campaign_id.in_(campaign_ids))
    elif current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Access denied.")

    if campaign_id is not None:
        query = query.filter(Application.campaign_id == campaign_id)
    if status:
        query = query.filter(Application.status == status)

    applications = query.order_by(Application.created_at.desc()).all()
    return [_response(app, app.campaign) for app in applications]


@router.post("/{application_id}/select", response_model=dict)
async def select_application(
    application_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_business),
):
    application = db.query(Application).filter(Application.id == application_id).first()
    if not application:
        raise HTTPException(status_code=404, detail="Application not found.")

    campaign = db.query(Campaign).filter(Campaign.id == application.campaign_id).first()
    if not campaign or campaign.business_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied.")
    if campaign.status != CampaignStatus.PUBLISHED or not campaign.is_active:
        raise HTTPException(status_code=400, detail="This campaign is no longer accepting selections.")
    # If the brand already started payment and simply came back, resume the
    # same Khalti payment instead of creating a second payment record.
    if application.status == "payment_pending":
        existing_payment = (
            db.query(Payment)
            .filter(
                Payment.application_id == application.id,
                Payment.payment_type == "selection_fee",
                Payment.status == "initiated",
            )
            .order_by(Payment.created_at.desc())
            .first()
        )
        if existing_payment and existing_payment.pidx:
            details = existing_payment.payment_details if isinstance(existing_payment.payment_details, dict) else {}
            payment_url = details.get("payment_url")
            if payment_url:
                platform_fee = float(existing_payment.platform_fee or 0)
                creator_payout = float(existing_payment.creator_payout or 0)
                return {
                    "application_id": application.id,
                    "payment_url": payment_url,
                    "pidx": existing_payment.pidx,
                    "purchase_order_id": existing_payment.purchase_order_id,
                    "amount": float(existing_payment.amount),
                    "platform_fee": platform_fee,
                    "creator_payout": creator_payout,
                    "pricing_term": campaign.engagement_type or campaign.pricing_model or "Campaign payment",
                    "pricing_basis": _pricing_basis(campaign),
                }

                 # No usable initiated payment remains, so allow a fresh attempt.
        application.status = "pending"
        db.commit()

    if application.status != "pending":
        raise HTTPException(status_code=400, detail="This application is no longer pending.")

    already_selected = db.query(Application).filter(
        Application.campaign_id == campaign.id,
        Application.status == "payment_pending",
        Application.id != application.id,
    ).first()
    if already_selected:
        raise HTTPException(status_code=400, detail="A creator is already awaiting payment for this campaign.")

    amount = _campaign_budget(campaign)
    platform_fee, creator_payout = _payment_breakdown(amount)
    purchase_order_id = f"SEL{application.id}-{int(time.time())}-{uuid4().hex[:6].upper()}"
    payment = Payment(
        application_id=application.id,
        campaign_id=campaign.id,
        payment_type="selection_fee",
        purchase_order_id=purchase_order_id,
        amount=amount,
        platform_fee=platform_fee,
        creator_payout=creator_payout,
        status="initiated",
        method="khalti",
        initiated_by=current_user.id,
        payment_details={
            "pricing_term": campaign.pricing_model or campaign.engagement_type or "Campaign payment",
            "platform_fee_rate": PLATFORM_FEE_RATE,
            "platform_fee": platform_fee,
            "creator_payout": creator_payout,
        },
    )
    application.status = "payment_pending"
    application.agreed_rate = amount
    application.rate = amount
    application.rate_locked = 1
    db.add(payment)
    db.commit()
    db.refresh(payment)

    business_profile = current_user.profile if isinstance(current_user.profile, dict) else {}
    business_name = business_profile.get("company_name") or current_user.full_name
    try:
        result = await initiate_payment(
            amount_npr=amount,
            purchase_order_id=purchase_order_id,
            purchase_order_name=f"Creator selection — {campaign.title}",
            return_url=f"{FRONTEND_URL}/payments/return",
            website_url=FRONTEND_URL,
            customer_name=business_name,
            customer_email=current_user.email,
        )
    except KhaltiError as exc:
        application.status = "pending"
        payment.status = "failed"
        db.commit()
        raise HTTPException(status_code=502, detail=f"Could not start payment: {exc.detail or str(exc)}")

    payment.pidx = result["pidx"]
    details = payment.payment_details if isinstance(payment.payment_details, dict) else {}
    details["payment_url"] = result["payment_url"]
    payment.payment_details = details
    db.commit()
    return {
        "application_id": application.id,
        "payment_url": result["payment_url"],
        "pidx": result["pidx"],
        "purchase_order_id": purchase_order_id,
        "amount": amount,
        "platform_fee": platform_fee,
        "creator_payout": creator_payout,
        "pricing_term": campaign.engagement_type or campaign.pricing_model or "Campaign payment",
        "pricing_basis": _pricing_basis(campaign),
    }
@router.put("/{application_id}", response_model=ApplicationResponse)
async def update_application_status(
    application_id: int,
    data: ApplicationUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_business),
):
    application = db.query(Application).filter(Application.id == application_id).first()
    if not application:
        raise HTTPException(status_code=404, detail="Application not found.")

    campaign = db.query(Campaign).filter(Campaign.id == application.campaign_id).first()
    if not campaign or campaign.business_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied.")

    if data.status != "rejected":
        raise HTTPException(status_code=400, detail="Use Select creator to begin the payment step.")
    if application.status != "pending":
        raise HTTPException(status_code=400, detail="This application is no longer pending.")

    application.status = "rejected"
    create_notification(
        db,
        user_id=application.creator_id,
        type="application_rejected",
        title="Application update",
        message=f"Your application to {campaign.title} was not selected this time.",
        link="/applications",
        reference_id=application.id,
        event_key=f"application-rejected:{application.id}",
    )
    db.commit()
    db.refresh(application)
    return _response(application, campaign)


@router.delete("/{application_id}")
async def withdraw_application(
    application_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_creator),
):
    application = db.query(Application).filter(Application.id == application_id).first()
    if not application or application.creator_id != current_user.id:
        raise HTTPException(status_code=404, detail="Application not found.")
    if application.status != "pending":
        raise HTTPException(status_code=400, detail="Only pending applications can be withdrawn.")
    application.status = "withdrawn"
    db.commit()
    return {"message": "Application withdrawn successfully."}
