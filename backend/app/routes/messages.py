"""Application conversations: messaging, price negotiation and the brand's
selection / chat-permission decisions.

Every endpoint authenticates the caller and checks they are the creator or
the brand of THAT application's conversation. Nothing trusts the client.
"""
from __future__ import annotations

from decimal import Decimal
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies.auth import get_current_user
from app.models import Application, Campaign, Conversation, ConversationEvent, Message, PriceOffer, User
from app.services import messaging as m
from app.services.notifications import create_notification

router = APIRouter(prefix="/api/conversations", tags=["Messages"])

MAX_OFFER = Decimal("100000000")


# ============================================================
# SCHEMAS
# ============================================================
class SendMessage(BaseModel):
    body: str = Field(..., min_length=1, max_length=m.MAX_MESSAGE_LENGTH)


class OfferCreate(BaseModel):
    amount: float = Field(..., gt=0)


class QuickReply(BaseModel):
    key: str = Field(..., min_length=1, max_length=40)


class RangeResponse(BaseModel):
    agree: bool
    amount: Optional[float] = Field(default=None, gt=0)


# ============================================================
# HELPERS
# ============================================================
def _display_name(user: Optional[User]) -> str:
    if not user:
        return "Unknown"
    prof = user.profile or {}
    return prof.get("display_name") or prof.get("company_name") or user.full_name or "User"


def _avatar(user: Optional[User]) -> Optional[str]:
    prof = (user.profile if user else None) or {}
    return prof.get("profile_image") or prof.get("logo_url")


def _load(db: Session, conv_id: int, user: User, lock: bool = False) -> tuple[Conversation, Application, Campaign]:
    """Load a conversation only for its two participants. Anyone else gets a
    404 so conversation ids cannot be probed."""
    q = db.query(Conversation).filter(Conversation.id == conv_id)
    if lock:
        q = q.with_for_update()
    conv = q.first()
    if not conv or user.id not in (conv.business_id, conv.creator_id):
        raise HTTPException(status_code=404, detail="Conversation not found.")
    application = db.query(Application).filter(Application.id == conv.application_id).first()
    campaign = db.query(Campaign).filter(Campaign.id == conv.campaign_id).first()
    if not application or not campaign:
        raise HTTPException(status_code=404, detail="Conversation not found.")
    # A creator who has not yet agreed to the brand's budget range is invisible to the brand.
    if user.id == conv.business_id and (application.status or "").lower() in (m.STATUS_RANGE_REVIEW, m.STATUS_RANGE_DECLINED):
        raise HTTPException(status_code=404, detail="Conversation not found.")
    return conv, application, campaign


def _range_prompt_open(db: Session, conv: Conversation, application: Application) -> bool:
    """True while the assistant is waiting for the creator to answer the range question."""
    if (application.status or "").lower() == m.STATUS_RANGE_REVIEW:
        return True
    last = (
        db.query(ConversationEvent)
        .filter(
            ConversationEvent.conversation_id == conv.id,
            ConversationEvent.event_type.in_(("range_prompt", "range_resolved")),
        )
        .order_by(ConversationEvent.id.desc())
        .first()
    )
    return bool(last and last.event_type == "range_prompt")


def _require_brand(conv: Conversation, user: User) -> None:
    if user.id != conv.business_id:
        raise HTTPException(status_code=403, detail="Only the brand can do this.")


def _message_out(msg: Message, viewer: User) -> dict:
    return {
        "id": msg.id,
        "kind": msg.kind,
        "body": msg.body,
        "sender_id": msg.sender_id,
        "mine": msg.sender_id == viewer.id,
        "offer_id": msg.offer_id,
        "created_at": msg.created_at.isoformat() if msg.created_at else None,
    }


def _offer_out(offer: PriceOffer) -> dict:
    return {
        "id": offer.id,
        "proposer_id": offer.proposer_id,
        "amount": float(offer.amount),
        "status": offer.status,
        "created_at": offer.created_at.isoformat() if offer.created_at else None,
    }


def _unread(db: Session, conv: Conversation, viewer: User) -> int:
    return (
        db.query(Message)
        .filter(
            Message.conversation_id == conv.id,
            Message.is_read.is_(False),
            Message.kind != m.KIND_SYSTEM,
            Message.sender_id != viewer.id,
        )
        .count()
    )


def _conv_out(db: Session, conv: Conversation, application: Application, campaign: Campaign, viewer: User) -> dict:
    decision = m.evaluate_send(db, conv, application, viewer)
    closed = m.is_closed(conv, application)
    other = conv.business if viewer.id == conv.creator_id else conv.creator
    last = (
        db.query(Message).filter(Message.conversation_id == conv.id).order_by(Message.id.desc()).first()
    )
    pending_offer = (
        db.query(PriceOffer)
        .filter(PriceOffer.conversation_id == conv.id, PriceOffer.status == "pending")
        .order_by(PriceOffer.id.desc())
        .first()
    )
    awaiting_selection = (
        conv.negotiation_status == m.NEG_PRICE_AGREED
        and conv.brand_decision == m.DECISION_PENDING
        and not closed
    )
    out = {
        "id": conv.id,
        "application_id": application.id,
        "campaign_id": campaign.id,
        "campaign_title": campaign.title,
        "price_type": conv.price_type,
        "application_status": application.status,
        "negotiation_status": conv.negotiation_status,
        "brand_decision": conv.brand_decision,
        "chat_permission_granted": bool(conv.chat_permission_granted),
        "is_closed": closed,
        "closed_reason": m.closed_reason(conv, application),
        "awaiting_selection": awaiting_selection,
        "listed_budget": float(campaign.budget) if campaign.budget is not None else None,
        "listed_budget_min": float(campaign.budget_min) if campaign.budget_min is not None else None,
        "listed_budget_max": float(campaign.budget_max) if campaign.budget_max is not None else None,
        "counterpart": {"id": other.id if other else None, "name": _display_name(other), "avatar": _avatar(other)},
        "my_role": "creator" if viewer.id == conv.creator_id else "business",
        "can_send": decision.allowed,
        "send_block_reason": decision.reason,
        "creator_messages_used": decision.used,
        "creator_messages_limit": m.FIXED_PRICE_CREATOR_MESSAGE_LIMIT if decision.remaining is not None else None,
        "creator_messages_remaining": decision.remaining,
        "pending_offer": _offer_out(pending_offer) if pending_offer else None,
        "unread_count": _unread(db, conv, viewer),
        "free_chat": m.is_free_chat(conv, application),
        "quick_replies": (
            m.quick_replies_for("creator" if viewer.id == conv.creator_id else "brand", conv.price_type)
            if not closed
            and not (getattr(viewer, "is_restricted", False) and viewer.role != "admin")
            and not (
                viewer.id == conv.creator_id
                and conv.price_type == "negotiable"
                and _range_prompt_open(db, conv, application)
            )
            else []
        ),
        "range_prompt_open": bool(
            viewer.id == conv.creator_id
            and conv.price_type == "negotiable"
            and not closed
            and _range_prompt_open(db, conv, application)
        ),
        "last_message": (
            {"body": last.body, "kind": last.kind, "created_at": last.created_at.isoformat() if last.created_at else None}
            if last else None
        ),
        "updated_at": (last.created_at if last and last.created_at else conv.created_at),
    }
    out["updated_at"] = out["updated_at"].isoformat() if out["updated_at"] else None
    out.update(m.agreed_totals(conv, campaign))
    return out



def _record_agreement(db: Session, conv: Conversation, application: Application, campaign: Campaign, actor: User, offer: PriceOffer) -> None:
    """Common tail of 'a price was agreed'. Does NOT select the creator, sign
    or activate anything; the brand still has to choose."""
    conv.negotiation_status = m.NEG_PRICE_AGREED
    conv.agreed_amount = offer.amount
    # Prefills the contract draft later.
    application.rate = offer.amount

    totals = m.agreed_totals(conv, campaign)
    m.add_system_message(
        db, conv,
        f"Price agreed: NPR {totals['agreed_total']:,.2f} creator compensation. "
        "Waiting for the brand to decide whether to select this creator.",
    )
    m.log_event(db, conv, actor.id, "price_agreed", {"offer_id": offer.id, "amount": float(offer.amount)})

    create_notification(
        db, user_id=conv.business_id, type="price_agreed", title="Price agreed - choose your creator",
        message=(
            f"{_display_name(conv.creator)} and you agreed on NPR {totals['agreed_total']:,.2f} for "
            f"{campaign.title}. Select the creator or decide not to."
        ),
        link=f"/applications?campaign={campaign.id}", reference_id=conv.id, event_key=f"price-agreed:{conv.id}:{offer.id}",
    )
    if actor.id == conv.business_id:
        create_notification(
            db, user_id=conv.creator_id, type="price_agreed", title="Price agreed",
            message=f"The brand accepted NPR {totals['agreed_total']:,.2f} for {campaign.title}. "
                    "They will decide whether to select you.",
            link=f"/messages?c={conv.id}", reference_id=conv.id, event_key=f"price-agreed-creator:{conv.id}:{offer.id}",
        )


def negotiation_summary(db: Session, application: Application) -> Optional[dict]:
    """Compact negotiation view for the brand's Applications screen: who
    agreed what, plus the offer history. None when there is no conversation."""
    conv = db.query(Conversation).filter(Conversation.application_id == application.id).first()
    if not conv:
        return None
    offers = db.query(PriceOffer).filter(PriceOffer.conversation_id == conv.id).order_by(PriceOffer.id.asc()).all()
    campaign = db.query(Campaign).filter(Campaign.id == conv.campaign_id).first()
    totals = m.agreed_totals(conv, campaign) if campaign else {}
    return {
        "conversation_id": conv.id,
        "price_type": conv.price_type,
        "negotiation_status": conv.negotiation_status,
        "brand_decision": conv.brand_decision,
        "agreed_amount": totals.get("agreed_amount"),
        "agreed_total": totals.get("agreed_total"),
        "platform_fee": totals.get("platform_fee"),
        "offers": [
            {
                "amount": float(o.amount),
                "status": o.status,
                "by": "brand" if o.proposer_id == conv.business_id else "creator",
                "created_at": o.created_at.isoformat() if o.created_at else None,
            }
            for o in offers
        ],
    }


# ============================================================
# LIST / OPEN
# ============================================================
@router.get("")
async def list_conversations(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    if user.role not in ("creator", "business"):
        raise HTTPException(status_code=403, detail="Messaging is for creators and brands.")
    column = Conversation.creator_id if user.role == "creator" else Conversation.business_id
    convs = db.query(Conversation).filter(column == user.id).all()
    rows = []
    for conv in convs:
        application = db.query(Application).filter(Application.id == conv.application_id).first()
        campaign = db.query(Campaign).filter(Campaign.id == conv.campaign_id).first()
        if application and campaign:
            if user.role == "business" and (application.status or "").lower() in (m.STATUS_RANGE_REVIEW, m.STATUS_RANGE_DECLINED):
                continue
            rows.append(_conv_out(db, conv, application, campaign, user))
    rows.sort(key=lambda r: r["updated_at"] or "", reverse=True)
    return rows


@router.get("/unread-count")
async def unread_count(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    if user.role not in ("creator", "business"):
        return {"count": 0}
    column = Conversation.creator_id if user.role == "creator" else Conversation.business_id
    count = (
        db.query(func.count(Message.id))
        .join(Conversation, Conversation.id == Message.conversation_id)
        .filter(
            column == user.id,
            Message.is_read.is_(False),
            Message.kind != m.KIND_SYSTEM,
            Message.sender_id != user.id,
        )
        .scalar()
    )
    return {"count": int(count or 0)}


@router.post("/by-application/{application_id}")
async def open_conversation(application_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    """Get (or create) the conversation for an application. Only that
    application's creator or the campaign's brand may open it."""
    application = db.query(Application).filter(Application.id == application_id).first()
    campaign = db.query(Campaign).filter(Campaign.id == application.campaign_id).first() if application else None
    if not application or not campaign or user.id not in (application.creator_id, campaign.business_id):
        raise HTTPException(status_code=404, detail="Application not found.")
    if user.id == campaign.business_id and (application.status or "").lower() in (m.STATUS_RANGE_REVIEW, m.STATUS_RANGE_DECLINED):
        raise HTTPException(status_code=404, detail="Application not found.")
    conv = m.get_or_create_conversation(db, application, campaign)
    db.commit()
    db.refresh(conv)
    return _conv_out(db, conv, application, campaign, user)


@router.get("/{conversation_id}")
async def get_conversation(
    conversation_id: int,
    after_id: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    conv, application, campaign = _load(db, conversation_id, user)
    # Reading marks the other party's messages as read. History is never deleted.
    db.query(Message).filter(
        Message.conversation_id == conv.id,
        Message.sender_id != user.id,
        Message.is_read.is_(False),
    ).update({"is_read": True}, synchronize_session=False)
    db.commit()
    messages = (
        db.query(Message)
        .filter(Message.conversation_id == conv.id, Message.id > after_id)
        .order_by(Message.id.asc())
        .all()
    )
    return {
        "conversation": _conv_out(db, conv, application, campaign, user),
        "messages": [_message_out(x, user) for x in messages],
    }


# ============================================================
# MESSAGES
# ============================================================
@router.post("/{conversation_id}/messages")
async def send_message(
    conversation_id: int,
    data: SendMessage,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    # Row lock: two parallel requests from the same creator cannot both
    # slip under the two-message limit.
    conv, application, campaign = _load(db, conversation_id, user, lock=True)

    body = data.body.strip()
    if not body:
        raise HTTPException(status_code=422, detail="Message cannot be empty.")

    if user.id == conv.creator_id and conv.price_type == "negotiable" and _range_prompt_open(db, conv, application):
        raise HTTPException(status_code=403, detail="Please answer the assistant's question about the budget range first.")

    decision = m.evaluate_send(db, conv, application, user)
    if not decision.allowed:
        db.rollback()
        if decision.reason == m.BLOCK_CLOSED:
            raise HTTPException(status_code=403, detail="This conversation is closed.")
        if decision.reason == m.BLOCK_GUIDED:
            raise HTTPException(
                status_code=403,
                detail="Free chat opens once the brand selects you. Please choose one of the quick replies for now.",
            )
        if decision.reason == m.BLOCK_LIMIT:
            raise HTTPException(
                status_code=403,
                detail=f"You have used your {m.FIXED_PRICE_CREATOR_MESSAGE_LIMIT} messages. "
                       "You can send more once the brand allows further chat.",
            )
        raise HTTPException(status_code=403, detail="You cannot send messages right now.")

    msg = Message(conversation_id=conv.id, sender_id=user.id, kind=m.KIND_USER, body=body, is_read=False)
    db.add(msg)
    db.flush()

    if user.id == conv.creator_id and decision.used == 0:
        create_notification(
            db,
            user_id=conv.business_id,
            type="chat_message",
            title="New message from a creator",
            message=f"{_display_name(user)} sent a message about {campaign.title}.",
            link=f"/messages?c={conv.id}",
            reference_id=conv.id,
            event_key=f"chat-first:{conv.id}",
        )
    db.commit()
    db.refresh(conv)
    return {"message": _message_out(msg, user), "conversation": _conv_out(db, conv, application, campaign, user)}


@router.post("/{conversation_id}/quick-reply")
async def send_quick_reply(
    conversation_id: int,
    data: QuickReply,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Guided chat: send one of the preset messages (greeting, details,
    negotiation...). This is how both sides talk before the deal is sealed.
    When a creator speaks for the first time the brand side greets them
    automatically."""
    conv, application, campaign = _load(db, conversation_id, user, lock=True)
    role = "creator" if user.id == conv.creator_id else "brand"

    if m.is_closed(conv, application):
        raise HTTPException(status_code=403, detail="This conversation is closed.")
    if getattr(user, "is_restricted", False) and user.role != "admin":
        raise HTTPException(status_code=403, detail="Your account is restricted.")
    if role == "creator" and conv.price_type == "negotiable" and _range_prompt_open(db, conv, application):
        raise HTTPException(status_code=403, detail="Please answer the assistant's question about the budget range first.")

    text = m.quick_reply_text(role, data.key, conv.price_type, campaign)
    if text is None:
        raise HTTPException(status_code=400, detail="That quick reply is not available.")

    first_creator_message = (
        role == "creator"
        and db.query(Message.id)
        .filter(
            Message.conversation_id == conv.id,
            Message.sender_id == conv.creator_id,
            Message.kind.in_((m.KIND_QUICK, m.KIND_USER)),
        )
        .first()
        is None
    )

    msg = Message(conversation_id=conv.id, sender_id=user.id, kind=m.KIND_QUICK, body=text, is_read=False)
    db.add(msg)
    db.flush()

    if first_creator_message:
        m.maybe_send_auto_greeting(db, conv, campaign)
        create_notification(
            db,
            user_id=conv.business_id,
            type="chat_message",
            title="New message from a creator",
            message=f"{_display_name(user)} sent a message about {campaign.title}.",
            link=f"/messages?c={conv.id}",
            reference_id=conv.id,
            event_key=f"chat-first:{conv.id}",
        )
    db.commit()
    db.refresh(conv)
    return {"message": _message_out(msg, user), "conversation": _conv_out(db, conv, application, campaign, user)}


# ============================================================
# PRICE NEGOTIATION (negotiable campaigns only)
# ============================================================
def _require_negotiating(conv: Conversation, application: Application) -> None:
    if conv.price_type != "negotiable":
        raise HTTPException(status_code=400, detail="Price offers are not available for fixed-price campaigns.")
    if m.is_closed(conv, application):
        raise HTTPException(status_code=403, detail="This conversation is closed.")
    if conv.brand_decision != m.DECISION_PENDING:
        raise HTTPException(status_code=400, detail="The brand has already made a selection decision.")
    if conv.negotiation_status != m.NEG_OPEN:
        raise HTTPException(status_code=400, detail="The price has already been agreed.")


@router.post("/{conversation_id}/offers")
async def make_offer(
    conversation_id: int,
    data: OfferCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    conv, application, campaign = _load(db, conversation_id, user, lock=True)
    _require_negotiating(conv, application)
    if getattr(user, "is_restricted", False) and user.role != "admin":
        raise HTTPException(status_code=403, detail="Your account is restricted.")
    amount = Decimal(str(data.amount)).quantize(Decimal("0.01"))
    if amount <= 0 or amount > MAX_OFFER:
        raise HTTPException(status_code=422, detail="Enter a valid amount.")

    if user.id == conv.creator_id:
        if _range_prompt_open(db, conv, application):
            raise HTTPException(status_code=403, detail="Please answer the assistant's question about the budget range first.")
        rng = m.budget_range(campaign)
        if rng and m.outside_range(float(amount), rng):
            # Do not forward an out-of-range offer to the brand. The assistant
            # states the brand's range and waits for the creator's answer.
            m.add_assistant_message(db, conv, m.range_prompt_text(float(amount), rng))
            m.log_event(db, conv, user.id, "range_prompt", {"amount": float(amount), "min": rng[0], "max": rng[1]})
            db.commit()
            db.refresh(conv)
            return _conv_out(db, conv, application, campaign, user)

    for old in db.query(PriceOffer).filter(PriceOffer.conversation_id == conv.id, PriceOffer.status == "pending").all():
        old.status = "superseded"
        old.responded_at = m.now()

    offer = PriceOffer(conversation_id=conv.id, proposer_id=user.id, amount=amount, status="pending")
    db.add(offer)
    db.flush()
    db.add(Message(
        conversation_id=conv.id, sender_id=user.id, kind=m.KIND_OFFER, offer_id=offer.id,
        body=f"Offered NPR {amount:,.2f}", is_read=False,
    ))
    m.log_event(db, conv, user.id, "offer_made", {"offer_id": offer.id, "amount": float(amount)})
    db.commit()
    db.refresh(conv)
    return _conv_out(db, conv, application, campaign, user)


@router.post("/{conversation_id}/range-response")
async def respond_to_range(
    conversation_id: int,
    data: RangeResponse,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """The creator answers the assistant's "continue within the brand's range?" question.

    * agree  -> the creator picks an amount inside the range. A held application
                is released to the brand (it now appears on their Applications
                page); during an open negotiation the amount is sent as an offer.
    * decline -> the assistant replies with a polite sorry message. A held
                application is withdrawn and never reaches the brand.
    """
    conv, application, campaign = _load(db, conversation_id, user, lock=True)
    if user.id != conv.creator_id:
        raise HTTPException(status_code=403, detail="Only the creator can answer this.")
    if conv.price_type != "negotiable" or m.is_closed(conv, application):
        raise HTTPException(status_code=400, detail="There is nothing to respond to.")
    if getattr(user, "is_restricted", False):
        raise HTTPException(status_code=403, detail="Your account is restricted.")
    rng = m.budget_range(campaign)
    if not rng or not _range_prompt_open(db, conv, application):
        raise HTTPException(status_code=400, detail="There is nothing to respond to.")

    held = (application.status or "").lower() == m.STATUS_RANGE_REVIEW

    if not data.agree:
        m.add_assistant_message(db, conv, m.RANGE_SORRY_TEXT)
        m.log_event(db, conv, user.id, "range_resolved", {"agree": False})
        if held:
            application.status = m.STATUS_RANGE_DECLINED
            conv.is_closed = True
            conv.closed_reason = "range_declined"
            conv.closed_at = m.now()
        db.commit()
        db.refresh(conv)
        return _conv_out(db, conv, application, campaign, user)

    if data.amount is None or data.amount < rng[0] or data.amount > rng[1]:
        raise HTTPException(
            status_code=400,
            detail=f"Choose an amount between NPR {rng[0]:,.0f} and NPR {rng[1]:,.0f}.",
        )
    amount = Decimal(str(data.amount)).quantize(Decimal("0.01"))

    if held:
        application.rate = amount
        application.status = "pending"
        m.add_assistant_message(
            db, conv,
            f"Thank you! You'll continue at NPR {amount:,.2f}, within the brand's range. "
            "Your application has now been sent to the brand.",
        )
        m.log_event(db, conv, user.id, "range_resolved", {"agree": True, "amount": float(amount)})
        create_notification(
            db,
            user_id=campaign.business_id,
            type="new_application",
            title="New application",
            message=f"{_display_name(user)} applied to {campaign.title}.",
            link=f"/applications?campaign={campaign.id}",
            reference_id=application.id,
            event_key=f"application-created:{application.id}",
        )
    else:
        _require_negotiating(conv, application)
        for old in db.query(PriceOffer).filter(PriceOffer.conversation_id == conv.id, PriceOffer.status == "pending").all():
            old.status = "superseded"
            old.responded_at = m.now()
        offer = PriceOffer(conversation_id=conv.id, proposer_id=user.id, amount=amount, status="pending")
        db.add(offer)
        db.flush()
        db.add(Message(
            conversation_id=conv.id, sender_id=user.id, kind=m.KIND_OFFER, offer_id=offer.id,
            body=f"Offered NPR {amount:,.2f}", is_read=False,
        ))
        m.add_assistant_message(
            db, conv, f"Thank you! Your offer of NPR {amount:,.2f} is within the brand's range and has been sent.",
        )
        m.log_event(db, conv, user.id, "offer_made", {"offer_id": offer.id, "amount": float(amount)})
        m.log_event(db, conv, user.id, "range_resolved", {"agree": True, "amount": float(amount)})
    db.commit()
    db.refresh(conv)
    return _conv_out(db, conv, application, campaign, user)


@router.post("/{conversation_id}/offers/{offer_id}/accept")
async def accept_offer(
    conversation_id: int, offer_id: int,
    db: Session = Depends(get_db), user: User = Depends(get_current_user),
):
    conv, application, campaign = _load(db, conversation_id, user, lock=True)
    _require_negotiating(conv, application)
    offer = db.query(PriceOffer).filter(PriceOffer.id == offer_id, PriceOffer.conversation_id == conv.id).first()
    if not offer or offer.status != "pending":
        raise HTTPException(status_code=400, detail="This offer is no longer open.")
    if offer.proposer_id == user.id:
        raise HTTPException(status_code=400, detail="You cannot accept your own offer.")

    offer.status = "accepted"
    offer.responded_at = m.now()
    _record_agreement(db, conv, application, campaign, user, offer)
    db.commit()
    db.refresh(conv)
    return _conv_out(db, conv, application, campaign, user)


@router.post("/{conversation_id}/accept-listed-price")
async def accept_listed_price(
    conversation_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user),
):
    """Creator agrees to the brand's original (starting) budget on a
    negotiable campaign. Counts as the brand's offer being accepted, so the
    brand still chooses whether to select this creator."""
    conv, application, campaign = _load(db, conversation_id, user, lock=True)
    if user.id != conv.creator_id:
        raise HTTPException(status_code=403, detail="Only the creator can accept the listed price.")
    _require_negotiating(conv, application)
    if campaign.budget is None or float(campaign.budget) <= 0:
        raise HTTPException(status_code=400, detail="This campaign has no listed starting budget.")
    if getattr(user, "is_restricted", False):
        raise HTTPException(status_code=403, detail="Your account is restricted.")

    for old in db.query(PriceOffer).filter(PriceOffer.conversation_id == conv.id, PriceOffer.status == "pending").all():
        old.status = "superseded"
        old.responded_at = m.now()
    offer = PriceOffer(
        conversation_id=conv.id, proposer_id=conv.business_id,
        amount=Decimal(str(campaign.budget)).quantize(Decimal("0.01")),
        status="accepted", responded_at=m.now(),
    )
    db.add(offer)
    db.flush()
    db.add(Message(
        conversation_id=conv.id, sender_id=user.id, kind=m.KIND_OFFER, offer_id=offer.id,
        body=f"Offered NPR {offer.amount:,.2f}", is_read=False,
    ))
    _record_agreement(db, conv, application, campaign, user, offer)
    db.commit()
    db.refresh(conv)
    return _conv_out(db, conv, application, campaign, user)


@router.post("/{conversation_id}/offers/{offer_id}/decline")
async def decline_offer(
    conversation_id: int, offer_id: int,
    db: Session = Depends(get_db), user: User = Depends(get_current_user),
):
    conv, application, campaign = _load(db, conversation_id, user, lock=True)
    _require_negotiating(conv, application)
    offer = db.query(PriceOffer).filter(PriceOffer.id == offer_id, PriceOffer.conversation_id == conv.id).first()
    if not offer or offer.status != "pending":
        raise HTTPException(status_code=400, detail="This offer is no longer open.")
    if offer.proposer_id == user.id:
        raise HTTPException(status_code=400, detail="You cannot decline your own offer.")
    offer.status = "declined"
    offer.responded_at = m.now()
    m.log_event(db, conv, user.id, "offer_declined", {"offer_id": offer.id})
    db.commit()
    db.refresh(conv)
    return _conv_out(db, conv, application, campaign, user)


# ============================================================
# BRAND DECISIONS
# ============================================================
@router.post("/{conversation_id}/select")
async def select_creator(
    conversation_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user),
):
    """Brand picks the creator after a negotiated price was agreed.

    Reuses the existing contract-draft logic. The contract is NOT signed or
    activated here; the normal finalize -> pay fee -> active flow continues.
    """
    from app.routes.applications import select_application

    conv, application, campaign = _load(db, conversation_id, user, lock=True)
    _require_brand(conv, user)
    if user.role != "business":
        raise HTTPException(status_code=403, detail="Only the brand can do this.")
    if conv.price_type != "negotiable":
        raise HTTPException(status_code=400, detail="Use the normal Select action for fixed-price campaigns.")
    if m.is_closed(conv, application):
        raise HTTPException(status_code=403, detail="This conversation is closed.")
    if conv.negotiation_status != m.NEG_PRICE_AGREED:
        raise HTTPException(status_code=400, detail="Agree on a price before selecting this creator.")
    if conv.brand_decision != m.DECISION_PENDING:
        raise HTTPException(status_code=400, detail="You have already made a decision for this creator.")

    # Existing logic: validates status/capacity/restrictions, creates the draft contract.
    result = await select_application(application.id, db=db, current_user=user)

    db.refresh(conv)
    db.refresh(application)
    application.status = "selected"
    conv.brand_decision = m.DECISION_SELECTED
    conv.decided_at = m.now()
    m.add_system_message(db, conv, "The brand selected this creator. You can continue the collaboration here.")
    m.log_event(db, conv, user.id, "creator_selected", {"contract_id": result.get("contract_id")})
    create_notification(
        db, user_id=conv.creator_id, type="creator_selected_chat", title="You were selected",
        message=f"A brand selected you for {campaign.title} at your agreed price. Keep chatting to plan the collaboration.",
        link=f"/messages?c={conv.id}", reference_id=conv.id, event_key=f"neg-selected:{conv.id}",
    )
    db.commit()
    db.refresh(conv)
    return {"conversation": _conv_out(db, conv, application, campaign, user), "contract_id": result.get("contract_id")}


@router.post("/{conversation_id}/not-select")
async def not_select_creator(
    conversation_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user),
):
    """Brand declines after price agreement. History is kept; messaging closes."""
    conv, application, campaign = _load(db, conversation_id, user, lock=True)
    _require_brand(conv, user)
    if user.role != "business":
        raise HTTPException(status_code=403, detail="Only the brand can do this.")
    if conv.price_type != "negotiable":
        raise HTTPException(status_code=400, detail="Use the normal reject action for fixed-price campaigns.")
    if m.is_closed(conv, application):
        raise HTTPException(status_code=403, detail="This conversation is closed.")
    if conv.negotiation_status != m.NEG_PRICE_AGREED:
        raise HTTPException(status_code=400, detail="Not available until a price has been agreed.")
    if conv.brand_decision != m.DECISION_PENDING:
        raise HTTPException(status_code=400, detail="You have already made a decision for this creator.")
    if (application.status or "").lower() != "pending":
        raise HTTPException(status_code=400, detail="This application is no longer pending.")

    application.status = "rejected"  # existing status convention
    conv.brand_decision = m.DECISION_NOT_SELECTED
    conv.decided_at = m.now()
    conv.is_closed = True
    conv.closed_reason = "not_selected"
    conv.closed_at = m.now()
    m.add_system_message(db, conv, "The brand decided not to select this creator. This conversation is now closed.")
    m.log_event(db, conv, user.id, "creator_not_selected", {})
    create_notification(
        db, user_id=conv.creator_id, type="application_rejected", title="Application update",
        message=f"Your application to {campaign.title} was not selected this time.",
        link="/applications", reference_id=application.id, event_key=f"application-rejected:{application.id}",
    )
    db.commit()
    db.refresh(conv)
    return _conv_out(db, conv, application, campaign, user)


@router.post("/{conversation_id}/allow-chat")
async def allow_further_chat(
    conversation_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user),
):
    """Fixed-price only. Unlocks two-way chat WITHOUT selecting the creator."""
    conv, application, campaign = _load(db, conversation_id, user, lock=True)
    _require_brand(conv, user)
    if user.role != "business":
        raise HTTPException(status_code=403, detail="Only the brand can do this.")
    if conv.price_type != "fixed":
        raise HTTPException(status_code=400, detail="Chat is already open for negotiable campaigns.")
    if m.is_closed(conv, application):
        raise HTTPException(status_code=403, detail="This conversation is closed.")
    if conv.chat_permission_granted:
        return _conv_out(db, conv, application, campaign, user)  # idempotent

    conv.chat_permission_granted = True
    conv.chat_permission_granted_at = m.now()
    m.add_system_message(db, conv, "The brand allowed further chat.")
    m.log_event(db, conv, user.id, "chat_permission_granted", {})
    create_notification(
        db, user_id=conv.creator_id, type="chat_permission_granted", title="You can keep chatting",
        message=f"The brand allowed further chat about {campaign.title}.",
        link=f"/messages?c={conv.id}", reference_id=conv.id, event_key=f"chat-allowed:{conv.id}",
    )
    db.commit()
    db.refresh(conv)
    return _conv_out(db, conv, application, campaign, user)