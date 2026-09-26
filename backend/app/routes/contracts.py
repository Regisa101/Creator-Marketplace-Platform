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
from app.services.pricing import total_for_rate

router = APIRouter(prefix="/api/contracts", tags=["Contracts"])
PLATFORM_FEE_RATE = 0.10


def _name(user: User | None) -> str | None:
    if not user:
        return None
    if user.role == "creator":
        profile = user.profile or {}
        return profile.get("display_name") or user.full_name
    profile = user.profile or {}
    return profile.get("company_name") or user.full_name


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
    contract.total_value = round(total, 2)
    contract.platform_fee_amount = round(total * PLATFORM_FEE_RATE, 2)
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


@router.post("/{contract_id}/pay-fee", response_model=ContractResponse)
async def pay_platform_fee(
    contract_id: int, data: ContractPayFeeRequest,
    db: Session = Depends(get_db), current_user: User = Depends(get_current_business),
):
    """
    DEMO PAYMENT ONLY. No real gateway (Khalti, eSewa, a card processor,
    etc.) is ever called here — this simulates a successful charge for the
    platform's 10% fee so the rest of the flow (activation + notifying the
    creator with the contract amount) can be tested end to end. Swap this
    block out for a real integration before going live.
    """
    contract = db.query(Contract).filter(
        Contract.id == contract_id, Contract.business_id == current_user.id
    ).first()
    if not contract:
        raise HTTPException(status_code=404, detail="Contract not found.")
    if contract.status != "pending_payment":
        raise HTTPException(status_code=400, detail="This contract isn't awaiting a fee payment.")
    if not contract.platform_fee_amount:
        raise HTTPException(status_code=400, detail="This contract has no service fee to pay yet.")

    if data.payment_method == "wallet" and not data.wallet_number:
        raise HTTPException(status_code=400, detail="Enter the wallet number.")
    if data.payment_method == "card" and not data.card_number:
        raise HTTPException(status_code=400, detail="Enter the card number.")

    contract.payment_method = data.payment_method
    contract.payment_reference = f"DEMO-{uuid.uuid4().hex[:10].upper()}"
    contract.fee_paid_at = datetime.now(timezone.utc)
    contract.status = "active"

    # This fee is CreatorHub's own service charge for matching the
    # brand with the creator — it is not money changing hands between
    # the brand and the creator, so 100% of it is platform revenue and
    # is recorded here (rather than split as a creator payout) so it
    # shows up correctly on the Admin Dashboard.
    fee_amount = round(float(contract.platform_fee_amount or 0), 2)
    payment = Payment(
        application_id=contract.application_id,
        campaign_id=contract.campaign_id,
        payment_type="platform_fee",
        purchase_order_id=contract.payment_reference,
        transaction_id=contract.payment_reference,
        amount=fee_amount,
        platform_fee=fee_amount,
        creator_payout=0,
        currency="NPR",
        status="completed",
        method=data.payment_method,
        payment_details={
            "wallet_number": data.wallet_number,
            "card_last4": data.card_number[-4:] if data.card_number else None,
            "note": "Platform service fee — 100% platform revenue, not a brand-to-creator payment.",
        },
        initiated_by=current_user.id,
        paid_at=contract.fee_paid_at,
    )
    db.add(payment)

    db.commit(); db.refresh(contract)

    create_notification(
        db,
        user_id=contract.creator_id,
        title="Contract activated",
        message=(
            f"{_name(contract.business) or 'A business'} activated your contract for "
            f"\"{contract.campaign.title if contract.campaign else 'a campaign'}\" — "
            f"agreed value NPR {float(contract.total_value or 0):,.0f}."
        ),
        link="/contracts",
    )

    return _response(contract)


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