from __future__ import annotations

from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies.auth import (
    get_active_business,
    get_active_creator,
    get_current_business,
    get_current_creator,
    get_current_user,
)
from app.models import User, Campaign, Application
from app.models.campaign import CampaignStatus
from app.schemas.application import (
    ApplicationCreate,
    ApplicationResponse,
    ApplicationUpdate,
    TrackerApplication,
    TrackerResponse,
    TrackerSummary,
)
from app.services.notifications import create_notification
from app.services.pricing import (
    campaign_fee_rate,
    candidate_rate_and_status,
    platform_fee_for,
    resolve_campaign_rate,
    total_for_rate,
)

router = APIRouter(prefix="/api/applications", tags=["Applications"])

# Maximum number of work images a creator can submit with one application.
# Keep this in sync with MAX_WORKS in ApplyModal.tsx.
MAX_WORKS = 5


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
        social_link=app.social_link,  # FIX: was missing, so the API always returned null
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



_SOCIAL_HOSTS = ("instagram.com", "instagr.am", "tiktok.com", "facebook.com", "fb.com")


def _clean_social_link(value):
    """Require a real Instagram / TikTok / Facebook profile link and return a clean https URL."""
    from urllib.parse import urlparse

    raw = (value or "").strip()
    if not raw or any(ch.isspace() for ch in raw):
        raise HTTPException(status_code=400, detail="Please add your Instagram, TikTok or Facebook profile link.")
    if not raw.lower().startswith(("http://", "https://")):
        raw = "https://" + raw
    parsed = urlparse(raw)
    host = (parsed.hostname or "").lower()
    for prefix in ("www.", "m.", "web.", "mbasic."):
        if host.startswith(prefix):
            host = host[len(prefix):]
    path_parts = [p for p in parsed.path.split("/") if p]
    if host not in _SOCIAL_HOSTS or not path_parts:
        raise HTTPException(
            status_code=400,
            detail="Enter a valid Instagram, TikTok or Facebook profile link (for example instagram.com/yourname).",
        )
    return f"https://{parsed.hostname}{parsed.path}" + (f"?{parsed.query}" if parsed.query else "")


@router.post("", response_model=ApplicationResponse)
async def create_application(
    data: ApplicationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_active_creator),
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

    # FIX: accept 1 to MAX_WORKS work images (was: exactly one).
    selected = data.selected_portfolio or []
    items = [
        i for i in selected
        if isinstance(i, dict) and str(i.get("media_url", "")).strip()
    ]
    if not items:
        raise HTTPException(status_code=400, detail="Please submit at least one work image with your application.")
    if len(items) > MAX_WORKS:
        raise HTTPException(status_code=400, detail=f"You can submit up to {MAX_WORKS} work images.")

    social_link = _clean_social_link(data.social_link)

    proposed_rate = None
    if data.rate is not None and float(data.rate) > 0:
        proposed_rate = round(float(data.rate), 2)
    else:
        # Falls back to the campaign's own fixed amount, when it has one
        # ("Custom amount" with a budget).
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
        selected_portfolio=items,  # FIX: was [item]
        social_link=social_link,
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


# ============================================================
# CREATOR APPLICATION TRACKER
# ============================================================

# Every backend status maps to exactly ONE bucket, so the summary cards
# always add up to the total (no double counting).
_STATUS_GROUPS = {
    "pending": "under_review",
    "selected": "under_review",
    "payment_pending": "under_review",
    "accepted": "accepted",
    "completed": "accepted",
    "rejected": "rejected",
    "withdrawn": "withdrawn",
}


def _status_group(status: str | None) -> str:
    return _STATUS_GROUPS.get((status or "").lower(), "under_review")


def _money(value) -> str:
    n = float(value)
    return f"NPR {n:,.0f}" if n == int(n) else f"NPR {n:,.2f}"


def _compensation_label(app: Application, campaign: Campaign | None) -> str | None:
    """Only real stored values are used; returns None when nothing is known."""
    if app.rate_locked and app.agreed_rate is not None:
        return _money(app.agreed_rate)
    if not campaign:
        return None
    if campaign.budget is not None:
        return _money(campaign.budget)
    if campaign.budget_min is not None and campaign.budget_max is not None:
        return f"{_money(campaign.budget_min)} – {_money(campaign.budget_max)}"
    return (campaign.compensation_description or "").strip() or None


def _campaign_platforms(campaign: Campaign | None) -> list[str]:
    # required_platform(s) are DB columns that may not be mapped on the model,
    # so read them defensively.
    if not campaign:
        return []
    many = getattr(campaign, "required_platforms", None)
    if isinstance(many, list) and many:
        return [str(p) for p in many if p]
    one = getattr(campaign, "required_platform", None)
    return [str(one)] if one else []


def _applied_platform(link: str | None) -> str | None:
    host = (link or "").lower()
    if "instagram.com" in host or "instagr.am" in host:
        return "Instagram"
    if "tiktok.com" in host:
        return "TikTok"
    if "facebook.com" in host or "fb.com" in host:
        return "Facebook"
    return None


@router.get("/tracker", response_model=TrackerResponse)
async def get_application_tracker(
    sort: str = Query("newest", pattern="^(newest|oldest)$"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_creator),
):
    """The authenticated creator's own applications, with summary counts.

    Scoped by creator_id from the JWT, so one creator can never see another's data.
    """
    from app.models import Contract

    order = Application.created_at.asc() if sort == "oldest" else Application.created_at.desc()
    apps = (
        db.query(Application)
        .filter(Application.creator_id == current_user.id)
        .order_by(order, Application.id.desc())
        .all()
    )

    contracts = {}
    if apps:
        rows = db.query(Contract).filter(Contract.application_id.in_([a.id for a in apps])).all()
        contracts = {c.application_id: c for c in rows}

    summary = TrackerSummary(total=len(apps))
    items: list[TrackerApplication] = []
    for a in apps:
        group = _status_group(a.status)
        setattr(summary, group, getattr(summary, group) + 1)

        campaign = a.campaign
        business = campaign.business if campaign else None
        profile = (business.profile or {}) if business else {}
        brand_name = (
            "CreatorHub" if business is not None and business.role == "admin"
            else profile.get("company_name") or (business.full_name if business else None)
        )
        contract = contracts.get(a.id)
        # Creators may only withdraw while the application is still pending and
        # the brand has not started a contract for it.
        can_withdraw = a.status == "pending" and contract is None

        items.append(
            TrackerApplication(
                id=a.id,
                campaign_id=a.campaign_id,
                campaign_title=campaign.title if campaign else None,
                campaign_category=campaign.category if campaign else None,
                brand_name=brand_name,
                brand_logo=profile.get("logo_url"),
                platforms=_campaign_platforms(campaign),
                applied_platform=_applied_platform(a.social_link),
                compensation=_compensation_label(a, campaign),
                raw_status=a.status or "pending",
                status_group=group,
                can_withdraw=can_withdraw,
                contract_id=contract.id if contract and contract.status in ("active", "completed") else None,
                created_at=a.created_at,
                updated_at=a.updated_at,
            )
        )

    return TrackerResponse(summary=summary, applications=items)


def build_evidence_snapshot(campaign, application, rate) -> dict:
    """Immutable record of what was agreed when a creator is selected."""
    return {
        "version": 1,
        "historical": True,
        "captured_at": datetime.now(timezone.utc).isoformat(),
        "campaign": {
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
            "start_date": campaign.start_date.isoformat() if campaign.start_date else None,
            "end_date": campaign.end_date.isoformat() if campaign.end_date else None,
            "application_deadline": campaign.application_deadline.isoformat() if campaign.application_deadline else None,
            "application_questions": campaign.application_questions or [],
            "hero_image": campaign.hero_image,
        },
        "application": {
            "id": application.id,
            "campaign_id": application.campaign_id,
            "creator_id": application.creator_id,
            "creator_name": application.creator_name,
            "proposal": application.proposal,
            "rate": float(application.rate) if application.rate is not None else None,
            "message": application.message,
            "application_answers": application.application_answers or [],
            "selected_portfolio": application.selected_portfolio or [],
            "social_link": application.social_link,
            "status": "pending",
            "agreed_rate": float(rate) if rate is not None else None,
            "rate_locked": bool(application.rate_locked),
            "deliverable_deadline": application.deliverable_deadline.isoformat() if application.deliverable_deadline else None,
            "created_at": application.created_at.isoformat() if application.created_at else None,
            "updated_at": application.updated_at.isoformat() if application.updated_at else None,
        },
    }


@router.post("/{application_id}/select", response_model=dict)
async def select_application(
    application_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_active_business),
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
    if application.creator and application.creator.is_restricted:
        raise HTTPException(status_code=400, detail="This creator's account is currently restricted and cannot be selected.")

    existing = db.query(Contract).filter(Contract.application_id == application.id).first()
    if existing:
        return {"application_id": application.id, "contract_id": existing.id, "contract_status": existing.status}

    # Only already-paid/active selections count as selected. Creating a draft
    # contract must NOT select the creator, close the campaign, reject other
    # applicants, or notify the creator. Those actions happen only after the
    # CreatorHub fee payment succeeds.
    selected_count = db.query(Application).filter(
        Application.campaign_id == campaign.id,
        Application.status == "accepted",
    ).count()
    if selected_count >= int(campaign.creators_needed or 1):
        raise HTTPException(status_code=400, detail="This campaign has already selected the required number of creators.")

    # The application remains pending while the business creates/finalizes
    # the contract. The creator is officially selected only after payment.
    rate, _can_activate = candidate_rate_and_status(application, campaign)
    total = total_for_rate(rate, campaign) if rate is not None else None
    fee_rate = campaign_fee_rate(campaign)
    contract = Contract(
        campaign_id=campaign.id, application_id=application.id, business_id=current_user.id, creator_id=application.creator_id,
        engagement_type=campaign.engagement_type, duration=campaign.duration, pricing_model=campaign.pricing_model,
        compensation_type=campaign.compensation_type, compensation_description=campaign.compensation_description,
        agreed_rate=rate, total_value=total, platform_fee_rate=fee_rate,
        platform_fee_amount=platform_fee_for(total, fee_rate) if total is not None else None,
        start_date=campaign.start_date, end_date=campaign.end_date, status="draft",
    )

    # Immutable collaboration evidence. This is captured at the moment the
    # business selects the creator so later edits to the campaign/application
    # cannot silently rewrite what the parties originally agreed to.
    contract.evidence_snapshot = build_evidence_snapshot(campaign, application, rate)
    # IMPORTANT: do not mutate application status or campaign status here.
    # Payment completion is the single point that makes the selection official.
    db.add(contract)
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
    from app.models import Contract

    application = db.query(Application).filter(Application.id == application_id).first()
    if not application or application.creator_id != current_user.id:
        raise HTTPException(status_code=404, detail="Application not found.")
    if application.status != "pending":
        raise HTTPException(status_code=400, detail="Only pending applications can be withdrawn.")

    # Once the brand has started a contract for this application it is no longer
    # a plain pending application, so the creator cannot pull out from here.
    has_contract = db.query(Contract).filter(Contract.application_id == application.id).first()
    if has_contract:
        raise HTTPException(
            status_code=400,
            detail="The brand has already started a contract for this application, so it can no longer be withdrawn.",
        )

    application.status = "withdrawn"
    campaign = application.campaign
    if campaign:
        create_notification(
            db,
            user_id=campaign.business_id,
            type="application_withdrawn",
            title="Application withdrawn",
            message=f"{current_user.full_name} withdrew their application to {campaign.title}.",
            link=f"/applications?campaign={campaign.id}",
            reference_id=application.id,
            event_key=f"application-withdrawn:{application.id}",
        )
    db.commit()
    return {"message": "Application withdrawn successfully."}