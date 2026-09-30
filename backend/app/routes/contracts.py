from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies.auth import get_current_business, get_current_user
from app.models import User, Campaign, Application, Contract, Payment
from app.schemas.contract import (
    ContractFinalizeRequest,
    ContractPayFeeRequest,
    ContractResponse,
    ContractSummary,
)
from app.services.notifications import create_notification
from app.services.pricing import PLATFORM_FEE_RATE, campaign_fee_rate, platform_fee_for, total_for_rate
from app.services.khalti import initiate_payment, KhaltiError
from app.core.config import FRONTEND_URL

router = APIRouter(prefix="/api/contracts", tags=["Contracts"])


def _name(user: User | None) -> str | None:
    if not user:
        return None
    if user.role == "creator":
        profile = user.profile or {}
        return profile.get("display_name") or user.full_name
    profile = user.profile or {}
    return profile.get("company_name") or user.full_name


def _iso(value):
    return value.isoformat() if value is not None else None


def _campaign_snapshot(campaign: Campaign | None) -> dict | None:
    if not campaign:
        return None
    return {
        "id": campaign.id,
        "title": campaign.title,
        "category": campaign.category,
        "description": campaign.description,
        "responsibilities": campaign.responsibilities,
        "creator_types": campaign.creator_types or [],
        "experience_level": campaign.experience_level,
        "required_skills": campaign.required_skills or [],
        "location": campaign.location,
        "work_arrangement": campaign.work_arrangement,
        "requirements": campaign.requirements,
        "deliverables": campaign.deliverables or [],
        "creators_needed": campaign.creators_needed,
        "engagement_type": campaign.engagement_type,
        "duration": campaign.duration,
        "pricing_model": campaign.pricing_model,
        "compensation_type": campaign.compensation_type,
        "budget": float(campaign.budget) if campaign.budget is not None else None,
        "budget_min": float(campaign.budget_min) if campaign.budget_min is not None else None,
        "budget_max": float(campaign.budget_max) if campaign.budget_max is not None else None,
        "compensation_description": campaign.compensation_description,
        "start_date": _iso(campaign.start_date),
        "end_date": _iso(campaign.end_date),
        "application_deadline": _iso(campaign.application_deadline),
        "application_questions": campaign.application_questions or [],
        "hero_image": campaign.hero_image,
        "captured_at": datetime.now(timezone.utc).isoformat(),
    }


def _application_snapshot(application: Application | None) -> dict | None:
    if not application:
        return None
    return {
        "id": application.id,
        "campaign_id": application.campaign_id,
        "creator_id": application.creator_id,
        "creator_name": _name(application.creator),
        "proposal": application.proposal,
        "rate": float(application.rate) if application.rate is not None else None,
        "message": application.message,
        "application_answers": application.application_answers or [],
        "selected_portfolio": application.selected_portfolio or [],
        "status": application.status,
        "agreed_rate": float(application.agreed_rate) if application.agreed_rate is not None else None,
        "rate_locked": bool(application.rate_locked),
        "deliverable_deadline": _iso(application.deliverable_deadline),
        "creator_confirmed": bool(application.creator_confirmed),
        "creator_verified": bool(application.creator_verified),
        "created_at": _iso(application.created_at),
        "updated_at": _iso(application.updated_at),
    }


def _build_snapshot(contract: Contract) -> dict:
    existing = contract.evidence_snapshot if isinstance(contract.evidence_snapshot, dict) else {}
    snapshot = dict(existing)
    snapshot.setdefault("version", 1)
    snapshot.setdefault("historical", True)
    snapshot.setdefault("captured_at", _iso(contract.created_at) or datetime.now(timezone.utc).isoformat())
    if "campaign" not in snapshot:
        snapshot["campaign"] = _campaign_snapshot(contract.campaign)
    if "application" not in snapshot:
        snapshot["application"] = _application_snapshot(contract.application)
    return snapshot


def _response(contract: Contract) -> ContractResponse:
    return ContractResponse(
        id=contract.id, campaign_id=contract.campaign_id, application_id=contract.application_id,
        business_id=contract.business_id, creator_id=contract.creator_id,
        engagement_type=contract.engagement_type, duration=contract.duration,
        pricing_model=contract.pricing_model, compensation_type=contract.compensation_type,
        compensation_description=contract.compensation_description,
        agreed_rate=float(contract.agreed_rate) if contract.agreed_rate is not None else None,
        total_value=float(contract.total_value) if contract.total_value is not None else None,
        platform_fee_rate=float(contract.platform_fee_rate or PLATFORM_FEE_RATE),
        platform_fee_amount=float(contract.platform_fee_amount) if contract.platform_fee_amount is not None else None,
        start_date=contract.start_date, end_date=contract.end_date, status=contract.status,
        terms_note=contract.terms_note,
        payment_method=contract.payment_method,
        payment_reference=contract.payment_reference,
        fee_paid=contract.fee_paid_at is not None, fee_paid_at=contract.fee_paid_at,
        created_at=contract.created_at, updated_at=contract.updated_at,
        campaign_title=contract.campaign.title if contract.campaign else None,
        creator_name=_name(contract.creator),
        business_name=_name(contract.business),
        evidence_snapshot=_build_snapshot(contract),
    )


# NOTE: Contract creation happens in routes/applications.py::select_application,
# which is what the frontend actually calls when a business selects a creator.


@router.get("", response_model=list[ContractResponse])
async def get_contracts(
    status: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = db.query(Contract)
    if current_user.role == "business":
        query = query.filter(Contract.business_id == current_user.id)
    elif current_user.role == "creator":
        query = query.filter(Contract.creator_id == current_user.id)
    elif current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Access denied.")
    if status:
        query = query.filter(Contract.status == status)
    return [_response(c) for c in query.order_by(Contract.created_at.desc()).all()]


@router.get("/{contract_id}", response_model=ContractResponse)
async def get_contract(contract_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    contract = db.query(Contract).filter(Contract.id == contract_id).first()
    if not contract:
        raise HTTPException(status_code=404, detail="Contract not found.")
    if current_user.role not in ("admin",) and current_user.id not in (contract.business_id, contract.creator_id):
        raise HTTPException(status_code=403, detail="Access denied.")
    return _response(contract)


@router.put("/{contract_id}/finalize", response_model=ContractResponse)
async def finalize_contract(
    contract_id: int, data: ContractFinalizeRequest,
    db: Session = Depends(get_db), current_user: User = Depends(get_current_business),
):
    """
    Business locks in the final terms. This does NOT activate the contract —
    it moves it to "pending_payment". The contract only becomes "active"
    once the 10% platform fee is paid via /pay-fee below.
    """
    contract = db.query(Contract).filter(Contract.id == contract_id).first()
    if not contract or contract.business_id != current_user.id:
        raise HTTPException(status_code=404, detail="Contract not found.")
    if contract.status not in ("draft", "pending_payment"):
        raise HTTPException(status_code=400, detail="This contract cannot be finalized.")

    campaign = contract.campaign
    total = data.total_value if data.total_value is not None else total_for_rate(data.agreed_rate, campaign)
    contract.agreed_rate = round(data.agreed_rate, 2)
    fee_rate = campaign_fee_rate(campaign)
    contract.total_value = round(total, 2)
    # Fee is charged ON TOP of the creator payment (total_value).
    contract.platform_fee_rate = fee_rate
    contract.platform_fee_amount = platform_fee_for(total, fee_rate)
    contract.terms_note = data.terms_note
    if data.start_date is not None:
        contract.start_date = data.start_date
    if data.end_date is not None:
        contract.end_date = data.end_date
    contract.status = "pending_payment"

    application = contract.application
    application.agreed_rate = contract.agreed_rate
    application.rate_locked = 1
    db.commit(); db.refresh(contract)
    return _response(contract)


@router.post("/{contract_id}/checkout")
async def initiate_contract_fee_checkout(
    contract_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_business),
):
    """Create a real hosted Khalti checkout for the CreatorHub service fee.

    CreatorHub never collects a Khalti PIN, OTP or card/wallet credentials.
    Khalti hosts the secure payment screen and redirects back with a pidx.
    The payment is not treated as complete until /api/payments/verify
    performs a server-side Khalti lookup.
    """
    contract = db.query(Contract).filter(
        Contract.id == contract_id,
        Contract.business_id == current_user.id,
    ).first()
    if not contract:
        raise HTTPException(status_code=404, detail="Contract not found.")
    if contract.fee_paid_at is not None:
        raise HTTPException(status_code=400, detail="This contract's service fee is already paid.")
    if contract.status not in ("pending_payment", "draft"):
        raise HTTPException(status_code=400, detail="This contract is not awaiting payment.")
    if not contract.platform_fee_amount or float(contract.platform_fee_amount) <= 0:
        raise HTTPException(status_code=400, detail="Finalize the contract value before paying the service fee.")

    purchase_order_id = f"CH-FEE-{contract.id}-{uuid.uuid4().hex[:10].upper()}"
    payment = Payment(
        application_id=contract.application_id,
        campaign_id=contract.campaign_id,
        payment_type="platform_fee",
        purchase_order_id=purchase_order_id,
        amount=round(float(contract.platform_fee_amount), 2),
        platform_fee=round(float(contract.platform_fee_amount), 2),
        creator_payout=0,
        currency="NPR",
        status="initiated",
        method="khalti",
        payment_details={
            "contract_id": contract.id,
            "fee_type": "CreatorHub service fee",
            "provider": "khalti",
        },
        initiated_by=current_user.id,
    )
    db.add(payment)
    db.commit()
    db.refresh(payment)

    profile = current_user.profile or {}
    customer_name = profile.get("company_name") or current_user.full_name
    customer_email = getattr(current_user, "email", None)

    try:
        checkout = await initiate_payment(
            amount_npr=float(payment.amount),
            purchase_order_id=purchase_order_id,
            purchase_order_name=f"CreatorHub service fee - {contract.campaign.title if contract.campaign else 'Campaign'}",
            return_url=f"{FRONTEND_URL}/payments/return",
            website_url=FRONTEND_URL,
            customer_name=customer_name,
            customer_email=customer_email,
        )
    except KhaltiError as exc:
        payment.status = "failed"
        details = payment.payment_details if isinstance(payment.payment_details, dict) else {}
        details["initiation_error"] = exc.detail or str(exc)
        payment.payment_details = details
        db.commit()
        raise HTTPException(
            status_code=502,
            detail=exc.detail or "Could not start Khalti checkout. Check the Khalti merchant configuration.",
        )

    pidx = checkout.get("pidx")
    payment_url = checkout.get("payment_url")
    if not pidx or not payment_url:
        payment.status = "failed"
        db.commit()
        raise HTTPException(status_code=502, detail="Khalti did not return a valid checkout session.")

    payment.pidx = pidx
    details = payment.payment_details if isinstance(payment.payment_details, dict) else {}
    details.update({
        "provider": "khalti",
        "checkout_created": True,
    })
    payment.payment_details = details
    db.commit()

    return {
        "payment_url": payment_url,
        "pidx": pidx,
        "purchase_order_id": purchase_order_id,
        "amount": float(payment.amount),
        "transaction_id": None,
        "contract": _response(contract),
    }

@router.post("/{contract_id}/pay-fee", response_model=ContractResponse)
async def pay_platform_fee_legacy(
    contract_id: int,
    data: ContractPayFeeRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_business),
):
    """Legacy endpoint disabled: payment must use the verified hosted checkout."""
    raise HTTPException(
        status_code=410,
        detail="This legacy payment endpoint is disabled. Use the secure Khalti /checkout endpoint.",
    )


@router.put("/{contract_id}/complete", response_model=ContractResponse)
async def complete_contract(contract_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_business)):
    contract = db.query(Contract).filter(Contract.id == contract_id, Contract.business_id == current_user.id).first()
    if not contract:
        raise HTTPException(status_code=404, detail="Contract not found.")
    if contract.status != "active":
        raise HTTPException(status_code=400, detail="Only active contracts can be completed.")
    contract.status = "completed"
    if contract.application:
        contract.application.status = "completed"
    db.commit(); db.refresh(contract)
    return _response(contract)


@router.get("/summary/me", response_model=ContractSummary)
async def contract_summary(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if current_user.role == "business":
        base = db.query(Contract).filter(Contract.business_id == current_user.id)
    elif current_user.role == "creator":
        base = db.query(Contract).filter(Contract.creator_id == current_user.id)
    else:
        base = db.query(Contract)
    active = base.filter(Contract.status == "active").count()
    lifetime = float(base.with_entities(func.coalesce(func.sum(Contract.platform_fee_amount), 0)).scalar() or 0) if current_user.role == "business" else float(base.with_entities(func.coalesce(func.sum(Contract.total_value), 0)).scalar() or 0)
    month_start = datetime.now(timezone.utc).replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    month = base.filter(Contract.created_at >= month_start)
    this_month = float(month.with_entities(func.coalesce(func.sum(Contract.platform_fee_amount if current_user.role == "business" else Contract.total_value), 0)).scalar() or 0)
    return ContractSummary(role=current_user.role, this_month=this_month, lifetime=lifetime, active_contracts=active)


# REMOVED: PUT /{contract_id}/fee-paid (self-reported "mark fee as paid").
# That manual step is gone now that /pay-fee (above) actually collects
# payment info and sets fee_paid_at itself — keeping both would give you
# two ways for a contract to end up "paid", which is exactly the kind of
# drift that bit the old duplicate contract-creation endpoint.