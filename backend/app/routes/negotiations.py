from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import User, Application, Campaign, NegotiationOffer
from app.schemas.negotiation import NegotiationOfferCreate, NegotiationOfferResponse
from app.dependencies.auth import get_current_user
from app.services.notifications import create_notification

router = APIRouter(prefix="/api/negotiations", tags=["Negotiations"])


def _campaign_type(campaign):
    return getattr(campaign.campaign_type, "value", str(campaign.campaign_type)) if campaign else None

def _get_application(db, application_id):
    app = db.query(Application).filter(Application.id == application_id).first()
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")
    campaign = db.query(Campaign).filter(Campaign.id == app.campaign_id).first()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    return app, campaign

def _authorize_pending(db, user, app, campaign):
    if app.status != "pending":
        raise HTTPException(status_code=400, detail="Negotiation is only available before the creator is selected.")
    if _campaign_type(campaign) != "paid":
        raise HTTPException(status_code=400, detail="Negotiation is only available for paid campaigns.")
    if user.role == "creator" and app.creator_id == user.id:
        return
    if user.role == "business" and campaign.business_id == user.id:
        return
    raise HTTPException(status_code=403, detail="You are not part of this application.")

def _response(db, offer):
    sender = db.query(User).filter(User.id == offer.sender_id).first()
    return NegotiationOfferResponse(
        id=offer.id, application_id=offer.application_id, sender_id=offer.sender_id,
        sender_name=sender.full_name if sender else None,
        sender_role=sender.role if sender else None, amount=float(offer.amount),
        message=offer.message, status=offer.status, created_at=offer.created_at,
        responded_at=offer.responded_at,
    )

@router.get("/{application_id}", response_model=list[NegotiationOfferResponse])
async def get_negotiation(application_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    app, campaign = _get_application(db, application_id)
    _authorize_pending(db, current_user, app, campaign)
    offers = db.query(NegotiationOffer).filter(NegotiationOffer.application_id == app.id).order_by(NegotiationOffer.created_at.asc(), NegotiationOffer.id.asc()).all()
    return [_response(db, o) for o in offers]

@router.post("/{application_id}/offers", response_model=NegotiationOfferResponse)
async def create_offer(application_id: int, data: NegotiationOfferCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    app, campaign = _get_application(db, application_id)
    _authorize_pending(db, current_user, app, campaign)

    # A new offer replaces the previous outstanding offer. Historical offers
    # remain visible for a complete audit trail.
    old_pending = db.query(NegotiationOffer).filter(
        NegotiationOffer.application_id == app.id, NegotiationOffer.status == "pending"
    ).all()
    for old in old_pending:
        old.status = "superseded"
        old.responded_at = datetime.now(timezone.utc)

    offer = NegotiationOffer(application_id=app.id, sender_id=current_user.id, amount=data.amount, message=data.message, status="pending")
    db.add(offer)
    app.negotiation_status = "pending"
    db.commit(); db.refresh(offer)

    recipient_id = campaign.business_id if current_user.role == "creator" else app.creator_id
    create_notification(
        db, user_id=recipient_id, type="negotiation_offer",
        title="New payment offer",
        message=f"A new offer of Rs. {data.amount:,.2f} was made for {campaign.title}.",
        link="/applications", reference_id=app.id,
        event_key=f"negotiation-offer:{offer.id}",
    )
    db.commit()
    return _response(db, offer)

@router.post("/{application_id}/offers/{offer_id}/accept", response_model=NegotiationOfferResponse)
async def accept_offer(application_id: int, offer_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    app, campaign = _get_application(db, application_id)
    _authorize_pending(db, current_user, app, campaign)
    offer = db.query(NegotiationOffer).filter(NegotiationOffer.id == offer_id, NegotiationOffer.application_id == app.id).first()
    if not offer or offer.status != "pending":
        raise HTTPException(status_code=404, detail="Offer is no longer available.")
    if offer.sender_id == current_user.id:
        raise HTTPException(status_code=400, detail="You cannot accept your own offer.")

    now = datetime.now(timezone.utc)
    offer.status = "accepted"
    offer.responded_at = now
    app.agreed_rate = offer.amount
    app.rate_locked = 1
    app.negotiation_status = "agreed"

    for other in db.query(NegotiationOffer).filter(NegotiationOffer.application_id == app.id, NegotiationOffer.id != offer.id, NegotiationOffer.status == "pending").all():
        other.status = "superseded"
        other.responded_at = now

    db.commit(); db.refresh(offer)
    create_notification(
        db, user_id=(campaign.business_id if current_user.role == "creator" else app.creator_id),
        type="negotiation_agreed", title="Payment amount agreed",
        message=f"The collaboration payment for {campaign.title} is now locked at Rs. {float(app.agreed_rate):,.2f}.",
        link="/applications", reference_id=app.id, event_key=f"negotiation-agreed:{app.id}:{offer.id}",
    )
    db.commit()
    return _response(db, offer)

@router.post("/{application_id}/offers/{offer_id}/reject", response_model=NegotiationOfferResponse)
async def reject_offer(application_id: int, offer_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    app, campaign = _get_application(db, application_id)
    _authorize_pending(db, current_user, app, campaign)
    offer = db.query(NegotiationOffer).filter(NegotiationOffer.id == offer_id, NegotiationOffer.application_id == app.id).first()
    if not offer or offer.status != "pending":
        raise HTTPException(status_code=404, detail="Offer is no longer available.")
    if offer.sender_id == current_user.id:
        raise HTTPException(status_code=400, detail="You cannot reject your own offer.")
    offer.status = "rejected"; offer.responded_at = datetime.now(timezone.utc)
    app.negotiation_status = "rejected"
    db.commit(); db.refresh(offer)
    return _response(db, offer)
