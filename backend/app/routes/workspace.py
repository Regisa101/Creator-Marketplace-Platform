from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import select

from app.database import get_db
from app.models import User, Application, Campaign, Message, CalendarEvent, Deliverable, Payment, Rating
from app.schemas.workspace import (
    CollabResponse,
    MessageCreate,
    MessageResponse,
    CalendarEventCreate,
    CalendarEventResponse,
    DeliverableCreate,
    DeliverableSubmit,
    DeliverableReview,
    DeliverableResponse,
)
from app.dependencies.auth import get_current_user, get_current_business, get_current_creator
from app.services.notifications import create_notification

router = APIRouter(prefix="/api/workspace", tags=["Workspace"])


# ============================================
# HELPERS
# ============================================

def _accepted_collab_query(db: Session, current_user: User):
    """Accepted Applications this user is a party to — the definition of
    an active collaboration. A completed collaboration moves to history."""
    query = db.query(Application).filter(Application.status == "accepted")
    if current_user.role == "creator":
        query = query.filter(Application.creator_id == current_user.id)
    elif current_user.role == "business":
        campaign_ids = select(Campaign.id).where(Campaign.business_id == current_user.id)
        query = query.filter(Application.campaign_id.in_(campaign_ids))
    return query


def _get_authorized_collab(db: Session, current_user: User, collab_id: int) -> Application:
    application = db.query(Application).filter(Application.id == collab_id).first()
    if not application or application.status not in ("accepted", "completed"):
        raise HTTPException(status_code=404, detail="Collaboration not found")

    campaign = db.query(Campaign).filter(Campaign.id == application.campaign_id).first()
    is_creator_party = current_user.role == "creator" and application.creator_id == current_user.id
    is_business_party = current_user.role == "business" and campaign and campaign.business_id == current_user.id

    if not (is_creator_party or is_business_party):
        raise HTTPException(status_code=403, detail="You're not part of this collaboration")

    return application


def _collab_to_response(db: Session, application: Application) -> CollabResponse:
    campaign = db.query(Campaign).filter(Campaign.id == application.campaign_id).first()
    business = db.query(User).filter(User.id == campaign.business_id).first() if campaign else None
    creator = db.query(User).filter(User.id == application.creator_id).first()

    deliverables = db.query(Deliverable).filter(Deliverable.application_id == application.id).all()
    pending_deliverables = sum(1 for d in deliverables if d.status in ("pending", "revision_requested"))
    submitted_deliverables = sum(1 for d in deliverables if d.status == "submitted")
    approved_deliverables = sum(1 for d in deliverables if d.status == "approved")

    latest_payment = (
        db.query(Payment)
        .filter(Payment.application_id == application.id)
        .order_by(Payment.created_at.desc())
        .first()
    )
    already_rated = (
        db.query(Rating).filter(Rating.application_id == application.id).first() is not None
    )

    return CollabResponse(
        id=application.id,
        campaign_id=application.campaign_id,
        campaign_title=campaign.title if campaign else None,
        business_id=campaign.business_id if campaign else 0,
        business_name=(business.profile or {}).get("company_name") if business else None,
        business_logo=(business.profile or {}).get("logo_url") if business else None,
        creator_id=application.creator_id,
        creator_name=(creator.profile or {}).get("display_name") if creator and creator.profile else (creator.full_name if creator else None),
        creator_avatar=(creator.profile or {}).get("profile_image") if creator and creator.profile else None,
        rate=float(application.rate) if application.rate is not None else None,
        status=application.status,
        created_at=application.created_at,
        pending_deliverables=pending_deliverables,
        unread_messages=0,
        payment_status=latest_payment.status if latest_payment else None,
        amount_paid=float(latest_payment.amount) if latest_payment and latest_payment.status == "completed" else None,
        rated=already_rated,
        campaign_type=campaign.campaign_type.value if campaign and hasattr(campaign.campaign_type, "value") else (str(campaign.campaign_type) if campaign else None),
        deliverable_deadline=application.deliverable_deadline or (campaign.deliverable_deadline if campaign else None),
        total_deliverables=len(deliverables),
        submitted_deliverables=submitted_deliverables,
        approved_deliverables=approved_deliverables,
    )


def _maybe_complete_campaign(db: Session, campaign: Campaign):
    required = campaign.creators_needed or 1
    selected = db.query(Application).filter(
        Application.campaign_id == campaign.id,
        Application.status.in_(["accepted", "completed"]),
    ).all()
    completed = [a for a in selected if a.status == "completed"]
    if len(selected) >= required and len(completed) >= required:
        campaign.status = "completed"
        campaign.is_active = False
        db.commit()


# ============================================
# ACTIVE COLLABS
# ============================================

@router.get("/collabs", response_model=list[CollabResponse])
async def get_collabs(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    applications = _accepted_collab_query(db, current_user).order_by(Application.updated_at.desc()).all()
    return [_collab_to_response(db, app) for app in applications]


@router.get("/history", response_model=list[CollabResponse])
async def get_collab_history(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Completed or voluntarily exited collaborations for this user."""
    query = db.query(Application).filter(Application.status.in_(["completed", "withdrawn"]))
    if current_user.role == "creator":
        query = query.filter(Application.creator_id == current_user.id)
    elif current_user.role == "business":
        campaign_ids = select(Campaign.id).where(Campaign.business_id == current_user.id)
        query = query.filter(Application.campaign_id.in_(campaign_ids))
    applications = query.order_by(Application.updated_at.desc(), Application.created_at.desc()).all()
    return [_collab_to_response(db, app) for app in applications]


# ============================================
# MESSAGES
# ============================================

@router.get("/messages", response_model=list[MessageResponse])
async def get_messages(
    collab_id: int = Query(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _get_authorized_collab(db, current_user, collab_id)

    messages = (
        db.query(Message)
        .filter(Message.application_id == collab_id)
        .order_by(Message.created_at.asc())
        .all()
    )

    results = []
    for m in messages:
        sender = db.query(User).filter(User.id == m.sender_id).first()
        sender_name = None
        if sender:
            if sender.role == "business":
                sender_name = (sender.profile or {}).get("company_name") or sender.full_name
            else:
                sender_name = (sender.profile or {}).get("display_name") or sender.full_name
        results.append(
            MessageResponse(
                id=m.id,
                application_id=m.application_id,
                sender_id=m.sender_id,
                sender_name=sender_name,
                sender_role=sender.role if sender else None,
                body=m.body,
                created_at=m.created_at,
            )
        )
    return results


@router.post("/messages", response_model=MessageResponse)
async def send_message(
    data: MessageCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _get_authorized_collab(db, current_user, data.collab_id)

    if not data.body.strip():
        raise HTTPException(status_code=400, detail="Message cannot be empty")

    message = Message(application_id=data.collab_id, sender_id=current_user.id, body=data.body.strip())
    db.add(message)
    db.commit()
    db.refresh(message)

    sender_name = (
        (current_user.profile or {}).get("company_name") or current_user.full_name
        if current_user.role == "business"
        else (current_user.profile or {}).get("display_name") or current_user.full_name
    )

    return MessageResponse(
        id=message.id,
        application_id=message.application_id,
        sender_id=message.sender_id,
        sender_name=sender_name,
        sender_role=current_user.role,
        body=message.body,
        created_at=message.created_at,
    )


# ============================================
# CALENDAR
# ============================================

def _calendar_to_response(db: Session, event: CalendarEvent) -> CalendarEventResponse:
    application = db.query(Application).filter(Application.id == event.application_id).first()
    campaign = db.query(Campaign).filter(Campaign.id == application.campaign_id).first() if application else None

    other_party_name = None
    if application:
        creator = db.query(User).filter(User.id == application.creator_id).first()
        business = db.query(User).filter(User.id == campaign.business_id).first() if campaign else None
        if event.created_by == application.creator_id:
            other_party_name = (business.profile or {}).get("company_name") if business else None
        else:
            other_party_name = (creator.profile or {}).get("display_name") if creator and creator.profile else (creator.full_name if creator else None)

    return CalendarEventResponse(
        id=event.id,
        application_id=event.application_id,
        campaign_title=campaign.title if campaign else None,
        other_party_name=other_party_name,
        title=event.title,
        description=event.description,
        event_date=event.event_date,
        event_type=event.event_type,
        created_by=event.created_by,
        created_at=event.created_at,
    )


@router.get("/calendar", response_model=list[CalendarEventResponse])
async def get_calendar_events(
    collab_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if collab_id is not None:
        _get_authorized_collab(db, current_user, collab_id)
        events = (
            db.query(CalendarEvent)
            .filter(CalendarEvent.application_id == collab_id)
            .order_by(CalendarEvent.event_date.asc())
            .all()
        )
    else:
        collab_ids = [c.id for c in _accepted_collab_query(db, current_user).all()]
        events = (
            db.query(CalendarEvent)
            .filter(CalendarEvent.application_id.in_(collab_ids))
            .order_by(CalendarEvent.event_date.asc())
            .all()
            if collab_ids
            else []
        )

    return [_calendar_to_response(db, e) for e in events]


@router.post("/calendar", response_model=CalendarEventResponse)
async def create_calendar_event(
    data: CalendarEventCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _get_authorized_collab(db, current_user, data.collab_id)

    event = CalendarEvent(
        application_id=data.collab_id,
        created_by=current_user.id,
        title=data.title,
        description=data.description,
        event_date=data.event_date,
        event_type=data.event_type or "milestone",
    )
    db.add(event)
    db.commit()
    db.refresh(event)
    return _calendar_to_response(db, event)


@router.delete("/calendar/{event_id}")
async def delete_calendar_event(
    event_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    event = db.query(CalendarEvent).filter(CalendarEvent.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    _get_authorized_collab(db, current_user, event.application_id)

    db.delete(event)
    db.commit()
    return {"message": "Event deleted"}


# ============================================
# DELIVERABLES
# ============================================

def _deliverable_to_response(db: Session, deliverable: Deliverable) -> DeliverableResponse:
    application = db.query(Application).filter(Application.id == deliverable.application_id).first()
    campaign = db.query(Campaign).filter(Campaign.id == application.campaign_id).first() if application else None
    other_party_name = None
    if application:
        creator = db.query(User).filter(User.id == application.creator_id).first()
        business = db.query(User).filter(User.id == campaign.business_id).first() if campaign else None
        # The response is role-neutral here; the frontend uses this only as a fallback label.
        other_party_name = (business.profile or {}).get("company_name") if business else None
        if other_party_name is None and creator:
            other_party_name = (creator.profile or {}).get("display_name") if creator.profile else creator.full_name

    return DeliverableResponse(
        id=deliverable.id,
        application_id=deliverable.application_id,
        campaign_title=campaign.title if campaign else None,
        other_party_name=other_party_name,
        title=deliverable.title,
        description=deliverable.description,
        due_date=deliverable.due_date,
        status=deliverable.status,
        file_url=deliverable.file_url,
        submission_note=deliverable.submission_note,
        feedback=deliverable.feedback,
        submitted_at=deliverable.submitted_at,
        created_at=deliverable.created_at,
        updated_at=deliverable.updated_at,
    )


@router.get("/deliverables", response_model=list[DeliverableResponse])
async def get_deliverables(
    collab_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if collab_id is not None:
        _get_authorized_collab(db, current_user, collab_id)
        deliverables = (
            db.query(Deliverable)
            .filter(Deliverable.application_id == collab_id)
            .order_by(Deliverable.created_at.desc())
            .all()
        )
    else:
        collab_ids = [c.id for c in _accepted_collab_query(db, current_user).all()]
        deliverables = (
            db.query(Deliverable)
            .filter(Deliverable.application_id.in_(collab_ids))
            .order_by(Deliverable.created_at.desc())
            .all()
            if collab_ids
            else []
        )

    return [_deliverable_to_response(db, d) for d in deliverables]


@router.post("/deliverables", response_model=DeliverableResponse)
async def create_deliverable(
    data: DeliverableCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_business),
):
    """Business defines what it expects the creator to submit."""
    application = _get_authorized_collab(db, current_user, data.collab_id)

    deliverable = Deliverable(
        application_id=application.id,
        title=data.title,
        description=data.description,
        due_date=data.due_date,
        status="pending",
    )
    db.add(deliverable)
    db.commit()
    db.refresh(deliverable)
    create_notification(
        db, user_id=application.creator_id, type="deliverable_requested",
        title="New deliverable requested",
        message=f"The brand requested: {deliverable.title}.",
        link=f"/workspace/deliverables?collab={application.id}",
        event_key=f"deliverable-requested:{deliverable.id}",
    )
    db.commit()
    return _deliverable_to_response(db, deliverable)


@router.put("/deliverables/{deliverable_id}/submit", response_model=DeliverableResponse)
async def submit_deliverable(
    deliverable_id: int,
    data: DeliverableSubmit,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_creator),
):
    from datetime import datetime, timezone

    deliverable = db.query(Deliverable).filter(Deliverable.id == deliverable_id).first()
    if not deliverable:
        raise HTTPException(status_code=404, detail="Deliverable not found")

    application = _get_authorized_collab(db, current_user, deliverable.application_id)
    if application.creator_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not your deliverable")

    deliverable.file_url = data.file_url
    deliverable.submission_note = data.submission_note
    deliverable.status = "submitted"
    deliverable.submitted_at = datetime.now(timezone.utc)
    deliverable.feedback = None
    db.commit()
    application = db.query(Application).filter(Application.id == deliverable.application_id).first()
    campaign = db.query(Campaign).filter(Campaign.id == application.campaign_id).first() if application else None
    if campaign:
        create_notification(
            db, user_id=campaign.business_id, type="deliverable_submitted",
            title="Creator submitted a deliverable",
            message=f"{deliverable.title} is ready for your review.",
            link=f"/workspace/deliverables?collab={deliverable.application_id}",
            event_key=f"deliverable-submitted:{deliverable.id}:{deliverable.submitted_at.isoformat()}",
        )
    db.commit()
    db.refresh(deliverable)
    return _deliverable_to_response(db, deliverable)


@router.put("/deliverables/{deliverable_id}/review", response_model=DeliverableResponse)
async def review_deliverable(
    deliverable_id: int,
    data: DeliverableReview,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_business),
):
    if data.status not in ("approved", "revision_requested"):
        raise HTTPException(status_code=400, detail="Status must be 'approved' or 'revision_requested'")

    deliverable = db.query(Deliverable).filter(Deliverable.id == deliverable_id).first()
    if not deliverable:
        raise HTTPException(status_code=404, detail="Deliverable not found")

    _get_authorized_collab(db, current_user, deliverable.application_id)

    if deliverable.status != "submitted":
        raise HTTPException(status_code=400, detail="Deliverable hasn't been submitted yet")

    deliverable.status = data.status
    deliverable.feedback = data.feedback
    db.commit()

    application = db.query(Application).filter(Application.id == deliverable.application_id).first()
    campaign = db.query(Campaign).filter(Campaign.id == application.campaign_id).first() if application else None
    if application and campaign:
        if data.status == "approved":
            create_notification(db, user_id=application.creator_id, type="deliverable_approved", title="Deliverable approved", message=f"{deliverable.title} was approved by the brand.", link=f"/workspace/deliverables?collab={application.id}", event_key=f"deliverable-approved:{deliverable.id}")
        else:
            create_notification(db, user_id=application.creator_id, type="revision_requested", title="Revision requested", message=f"The brand requested changes to {deliverable.title}.", link=f"/workspace/deliverables?collab={application.id}", event_key=f"revision-requested:{deliverable.id}:{deliverable.updated_at or deliverable.created_at}")
        db.commit()

    # A collaboration is complete only after every deliverable is approved.
    application = db.query(Application).filter(Application.id == deliverable.application_id).first()
    if application and data.status == "approved":
        all_deliverables = db.query(Deliverable).filter(Deliverable.application_id == application.id).all()
        all_approved = bool(all_deliverables) and all(d.status == "approved" for d in all_deliverables)
        if all_approved:
            from app.models import Campaign, Payment
            campaign = db.query(Campaign).filter(Campaign.id == application.campaign_id).first()
            if campaign and campaign.campaign_type.value == "gifted":
                from app.models import GiftFulfillment
                fulfillment = db.query(GiftFulfillment).filter(GiftFulfillment.application_id == application.id).first()
                if fulfillment and fulfillment.status == "received":
                    application.status = "completed"
            else:
                paid = db.query(Payment).filter(Payment.application_id == application.id, Payment.status == "completed").first()
                if paid:
                    application.status = "completed"
            db.commit()
            if application.status == "completed" and campaign:
                _maybe_complete_campaign(db, campaign)

    db.refresh(deliverable)
    return _deliverable_to_response(db, deliverable)
