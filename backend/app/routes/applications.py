from __future__ import annotations

from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies.auth import get_current_business, get_current_creator, get_current_user
from app.models import User, Campaign, Application
from app.models.campaign import CampaignStatus
from app.schemas.application import ApplicationCreate, ApplicationResponse, ApplicationUpdate
from app.services.notifications import create_notification
from app.services.pricing import candidate_rate_and_status, resolve_campaign_rate, total_for_rate

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
        # Campaign deadlines are date-based. A deadline of Sep 25 remains
        # open throughout Sep 25 and closes when Sep 26 begins.
        deadline_date = campaign.application_deadline
        if deadline_date.tzinfo is not None:
            deadline_date = deadline_date.astimezone(timezone.utc)
        if deadline_date.date() < datetime.now(timezone.utc).date():
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

    proposed_rate = None
    if data.rate is not None and float(data.rate) > 0:
        proposed_rate = round(float(data.rate), 2)
    else:
        # Falls back to the campaign's own fixed rate, when it has one
        # ("Custom amount" with a budget, or "CreatorHub standard rate").
        # "Budget range" and "Negotiable" campaigns correctly leave this None.
        proposed_rate = resolve_campaign_rate(campaign)

    application = Application(
        campaign_id=campaign.id,
        creator_id=current_user.id,
        proposal=(data.proposal or "Application submitted").strip() or "Application submitted",
        rate=proposed_rate,
        agreed_rate=None,
        rate_locked=0,
        message=data.message,
        application_answers=[{"question": q, "answer": answer_by_question[q]} for q in questions],
        selected_portfolio=[item],
        status="pending",
    )
    db.add(application)
    db.commit()
    db.refresh(application)
    create_notification(
        db,
        user_id=campaign.business_id,
        type="new_application",
        title="New application",
        message=f"{current_user.full_name} applied to {campaign.title}.",
        link=f"/applications?campaign={campaign.id}",
        reference_id=application.id,
        event_key=f"application-created:{application.id}",
    )
    db.commit()
    return _response(application, campaign)


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
    """Select a creator and create the contract draft. No creator payment is processed here."""
    from app.models import Contract

    application = db.query(Application).filter(Application.id == application_id).first()
    if not application:
        raise HTTPException(status_code=404, detail="Application not found.")
    campaign = db.query(Campaign).filter(Campaign.id == application.campaign_id).first()
    if not campaign or campaign.business_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied.")
    if application.status not in ("pending", "selected"):
        raise HTTPException(status_code=400, detail="This application is no longer pending.")

    existing = db.query(Contract).filter(Contract.application_id == application.id).first()
    if existing:
        return {"application_id": application.id, "contract_id": existing.id, "contract_status": existing.status}

    # One creator is selected at a time unless the campaign explicitly needs more.
    selected_count = db.query(Application).filter(
        Application.campaign_id == campaign.id,
        Application.status == "accepted",
    ).count()
    if selected_count >= int(campaign.creators_needed or 1):
        raise HTTPException(status_code=400, detail="This campaign has already selected the required number of creators.")

    application.status = "selected"
    db.commit()

    # rate/status: if the CAMPAIGN itself fixed the compensation ("Custom
    # amount" with a budget, or "CreatorHub standard rate"), the contract can
    # go active immediately. Otherwise a creator's proposed rate is only a
    # starting point for negotiation — the contract stays "draft" until the
    # business finalizes it (see PUT /contracts/{id}/finalize).
    rate, can_activate = candidate_rate_and_status(application, campaign)
    total = total_for_rate(rate, campaign) if rate is not None else None
    contract = Contract(
        campaign_id=campaign.id, application_id=application.id, business_id=current_user.id, creator_id=application.creator_id,
        engagement_type=campaign.engagement_type, duration=campaign.duration, pricing_model=campaign.pricing_model,
        compensation_type=campaign.compensation_type, compensation_description=campaign.compensation_description,
        agreed_rate=rate, total_value=total, platform_fee_rate=0.10,
        platform_fee_amount=round(total * 0.10, 2) if total is not None else None,
        start_date=campaign.start_date, end_date=campaign.end_date, status="active" if can_activate else "draft",
    )
    application.status = "accepted"
    application.agreed_rate = rate
    application.rate_locked = 1 if can_activate else 0
    db.add(contract)
    create_notification(
        db, user_id=application.creator_id, type="application_accepted",
        title="You’ve been selected", message=f"{current_user.profile.get('company_name') if isinstance(current_user.profile, dict) else current_user.full_name} selected you for {campaign.title}.",
        link=f"/campaigns/{campaign.id}", reference_id=application.id, event_key=f"application-accepted:{application.id}",
    )

    # Once every creator slot this campaign needed has been filled, it is
    # no longer a live opportunity — pull it off the public marketplace
    # (Campaigns page + Landing page) immediately. It still stays visible
    # to the business on their own Campaigns dashboard since the query
    # there is not filtered by status.
    filled_count = selected_count + 1
    if filled_count >= int(campaign.creators_needed or 1):
        campaign.status = CampaignStatus.CLOSED
        campaign.is_active = False
        # Reject any applications still pending for this campaign — the
        # required number of creators has already been selected.
        still_pending = db.query(Application).filter(
            Application.campaign_id == campaign.id,
            Application.id != application.id,
            Application.status == "pending",
        ).all()
        for other in still_pending:
            other.status = "rejected"
            create_notification(
                db, user_id=other.creator_id, type="application_rejected",
                title="Campaign closed",
                message=f"The creator(s) for {campaign.title} have been selected. Your application was not selected.",
                link="/applications", reference_id=other.id,
                event_key=f"application-rejected-closed:{other.id}",
            )

    db.commit(); db.refresh(contract)
    return {
        "application_id": application.id, "contract_id": contract.id, "contract_status": contract.status,
        "agreed_rate": float(contract.agreed_rate) if contract.agreed_rate is not None else None,
        "total_value": float(contract.total_value) if contract.total_value is not None else None,
        "platform_fee": float(contract.platform_fee_amount) if contract.platform_fee_amount is not None else None,
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
        raise HTTPException(status_code=400, detail="Only pending applications can be rejected or selected.")
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