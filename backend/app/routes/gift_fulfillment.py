from datetime import datetime, timezone
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import GiftFulfillment, Application, Campaign, User, Deliverable
from app.schemas.gift_fulfillment import GiftFulfillmentUpdate, GiftFulfillmentResponse
from app.dependencies.auth import get_current_user
from app.routes.workspace import _get_authorized_collab
from app.services.notifications import create_notification

router = APIRouter(prefix="/api/workspace/fulfillment", tags=["Gift Fulfillment"])


def _get_fulfillment(db: Session, collab_id: int) -> GiftFulfillment | None:
    return db.query(GiftFulfillment).filter(GiftFulfillment.application_id == collab_id).first()


def _ensure_gift_collab(db: Session, current_user: User, collab_id: int) -> Application:
    application = _get_authorized_collab(db, current_user, collab_id)
    campaign = db.query(Campaign).filter(Campaign.id == application.campaign_id).first()
    if not campaign or campaign.campaign_type.value != "gifted":
        raise HTTPException(status_code=400, detail="This collaboration does not use product fulfillment.")
    fulfillment = _get_fulfillment(db, collab_id)
    if not fulfillment:
        fulfillment = GiftFulfillment(application_id=collab_id, status="pending")
        db.add(fulfillment)
        db.commit()
        db.refresh(fulfillment)
    return application


def _creator_and_business(db: Session, application: Application):
    campaign = db.query(Campaign).filter(Campaign.id == application.campaign_id).first()
    creator = db.query(User).filter(User.id == application.creator_id).first()
    business = db.query(User).filter(User.id == campaign.business_id).first() if campaign else None
    return campaign, creator, business


def _maybe_complete_gifted(db: Session, application: Application):
    if application.status != "accepted":
        return
    fulfillment = _get_fulfillment(db, application.id)
    deliverables = db.query(Deliverable).filter(Deliverable.application_id == application.id).all()
    all_approved = (not deliverables) or all(d.status == "approved" for d in deliverables)
    product_received = bool(fulfillment and fulfillment.status == "received")
    if all_approved and product_received:
        application.status = "completed"
        campaign = db.query(Campaign).filter(Campaign.id == application.campaign_id).first()
        if campaign:
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
            db,
            user_id=application.creator_id,
            type="collaboration_completed",
            title="Collaboration completed",
            message="Your gifted collaboration is complete. Great work!",
            link=f"/workspace/history",
            event_key=f"collab-completed:{application.id}",
        )
        if campaign:
            create_notification(
                db,
                user_id=campaign.business_id,
                type="collaboration_completed",
                title="Collaboration completed",
                message="The gifted collaboration has been completed.",
                link=f"/workspace/history",
                event_key=f"collab-completed-business:{application.id}",
            )
        db.commit()


@router.get("/{collab_id}", response_model=GiftFulfillmentResponse)
async def get_fulfillment(
    collab_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _ensure_gift_collab(db, current_user, collab_id)
    return _get_fulfillment(db, collab_id)


@router.patch("/{collab_id}", response_model=GiftFulfillmentResponse)
async def update_fulfillment(
    collab_id: int,
    data: GiftFulfillmentUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    application = _ensure_gift_collab(db, current_user, collab_id)
    fulfillment = _get_fulfillment(db, collab_id)
    campaign, creator, business = _creator_and_business(db, application)

    if current_user.role == "creator":
        if data.method is not None and data.method not in ("pickup", "shipping"):
            raise HTTPException(status_code=400, detail="Choose pickup or shipping.")
        if data.method is not None:
            fulfillment.method = data.method
        if data.recipient_name is not None:
            fulfillment.recipient_name = data.recipient_name
        if data.shipping_address is not None:
            fulfillment.shipping_address = data.shipping_address
        if data.phone is not None:
            fulfillment.phone = data.phone
        if fulfillment.method == "shipping" and fulfillment.shipping_address:
            fulfillment.status = "preparing"
            if business:
                create_notification(
                    db, user_id=business.id, type="gift_shipping_requested",
                    title="Gift delivery details received",
                    message="The creator has provided a shipping address for the gifted collaboration.",
                    link=f"/workspace/fulfillment?collab={collab_id}",
                    event_key=f"gift-details:{collab_id}",
                )
        elif fulfillment.method == "pickup":
            if business:
                create_notification(
                    db, user_id=business.id, type="gift_pickup_requested",
                    title="Creator chose store pickup",
                    message="The creator selected pickup for the gifted collaboration.",
                    link=f"/workspace/fulfillment?collab={collab_id}",
                    event_key=f"gift-pickup-choice:{collab_id}",
                )
    else:
        allowed_statuses = {"pending", "preparing", "ready_for_pickup", "shipped"}
        if data.status is not None and data.status not in allowed_statuses:
            raise HTTPException(status_code=400, detail="Invalid fulfillment status.")
        if data.status is not None:
            fulfillment.status = data.status
        if data.pickup_location is not None:
            fulfillment.pickup_location = data.pickup_location
        if data.pickup_available_from is not None:
            fulfillment.pickup_available_from = data.pickup_available_from
        if data.courier is not None:
            fulfillment.courier = data.courier
        if data.tracking_number is not None:
            fulfillment.tracking_number = data.tracking_number
        if data.notes is not None:
            fulfillment.notes = data.notes
        if fulfillment.method == "pickup" and fulfillment.pickup_location and data.status == "ready_for_pickup":
            if not fulfillment.pickup_code:
                fulfillment.pickup_code = f"NOODLE-{uuid4().hex[:6].upper()}"
            create_notification(
                db, user_id=application.creator_id, type="gift_ready",
                title="Your product is ready for pickup",
                message=f"Pick up your gift at {fulfillment.pickup_location}. Pickup code: {fulfillment.pickup_code}.",
                link=f"/workspace/fulfillment?collab={collab_id}",
                event_key=f"gift-ready:{collab_id}",
            )
        elif fulfillment.method == "shipping" and data.status == "shipped":
            create_notification(
                db, user_id=application.creator_id, type="gift_shipped",
                title="Your gifted product has been shipped",
                message=f"{fulfillment.courier or 'The courier'} is delivering your product{(' · Tracking: ' + fulfillment.tracking_number) if fulfillment.tracking_number else ''}.",
                link=f"/workspace/fulfillment?collab={collab_id}",
                event_key=f"gift-shipped:{collab_id}",
            )

    db.commit()
    db.refresh(fulfillment)
    return fulfillment


@router.post("/{collab_id}/received", response_model=GiftFulfillmentResponse)
async def confirm_received(
    collab_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    application = _ensure_gift_collab(db, current_user, collab_id)
    if current_user.role != "creator":
        raise HTTPException(status_code=403, detail="Only the creator can confirm receipt.")

    fulfillment = _get_fulfillment(db, collab_id)
    if fulfillment.status not in ("ready_for_pickup", "shipped"):
        raise HTTPException(status_code=400, detail="The product is not ready to be marked received.")

    fulfillment.status = "received"
    fulfillment.received_at = datetime.now(timezone.utc)
    campaign, creator, business = _creator_and_business(db, application)
    if business:
        create_notification(
            db, user_id=business.id, type="gift_received",
            title="Creator received the product",
            message="The creator confirmed that the gifted product was received.",
            link=f"/workspace/fulfillment?collab={collab_id}",
            event_key=f"gift-received:{collab_id}",
        )
    db.commit()
    _maybe_complete_gifted(db, application)
    db.refresh(fulfillment)
    return fulfillment
