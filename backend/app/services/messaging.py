"""Chat / negotiation permission rules for CreatorHub.

Every rule lives here as plain functions so the routes stay thin and the
rules can be unit-tested without HTTP.

State is kept in separate fields on purpose (see models/conversation.py):

    application.status        pending | selected | accepted | rejected | withdrawn | ...
    conversation.negotiation_status   none | open | price_agreed
    conversation.brand_decision       pending | selected | not_selected
    conversation.chat_permission_granted  bool
    conversation.is_closed            bool
"""
from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy.orm import Session

from app.models import Application, Campaign, Contract, Conversation, ConversationEvent, Message
from app.services.pricing import (
    PRICE_FIXED,
    PRICE_NEGOTIABLE,
    campaign_fee_rate,
    derive_price_type,
    platform_fee_for,
    total_for_rate,
)

# Fixed-price creators may send this many messages before the brand allows more.
FIXED_PRICE_CREATOR_MESSAGE_LIMIT = 2
MAX_MESSAGE_LENGTH = 2000

NEG_NONE = "none"
NEG_OPEN = "open"
NEG_PRICE_AGREED = "price_agreed"

DECISION_PENDING = "pending"
DECISION_SELECTED = "selected"
DECISION_NOT_SELECTED = "not_selected"

KIND_USER = "user"
KIND_SYSTEM = "system"
KIND_OFFER = "offer"

# Application statuses that end all messaging. Nothing in the codebase
# reopens these, and no reopening endpoint exists.
CLOSED_APPLICATION_STATUSES = ("rejected", "withdrawn")
# Application statuses that mean the creator is working with the brand.
COLLABORATING_APPLICATION_STATUSES = ("selected", "accepted", "completed")

# Reasons returned to the client when sending is blocked.
BLOCK_CLOSED = "closed"
BLOCK_LIMIT = "message_limit_reached"
BLOCK_RESTRICTED = "account_restricted"


def now() -> datetime:
    return datetime.now(timezone.utc)


def log_event(db: Session, conv: Conversation, actor_id: Optional[int], event_type: str, data: Optional[dict] = None) -> None:
    db.add(ConversationEvent(conversation_id=conv.id, actor_id=actor_id, event_type=event_type, data=data or {}))


def add_system_message(db: Session, conv: Conversation, body: str) -> Message:
    msg = Message(conversation_id=conv.id, sender_id=None, kind=KIND_SYSTEM, body=body, is_read=False)
    db.add(msg)
    return msg


def is_closed(conv: Conversation, application: Application) -> bool:
    """Closed explicitly, or because the application itself ended."""
    return bool(conv.is_closed) or (application.status or "").lower() in CLOSED_APPLICATION_STATUSES


def closed_reason(conv: Conversation, application: Application) -> Optional[str]:
    if conv.is_closed:
        return conv.closed_reason or "closed"
    status = (application.status or "").lower()
    if status in CLOSED_APPLICATION_STATUSES:
        return status
    return None


def creator_message_count(db: Session, conv: Conversation) -> int:
    """Only user-typed messages by the creator count. Brand replies, system
    lines and offer cards never consume the allowance."""
    return (
        db.query(Message)
        .filter(
            Message.conversation_id == conv.id,
            Message.kind == KIND_USER,
            Message.sender_id == conv.creator_id,
        )
        .count()
    )


def creator_has_open_chat(conv: Conversation, application: Application, has_contract: bool = False) -> bool:
    """True when the creator is not limited by the two-message allowance.

    ``has_contract`` is True once the brand has started a contract for the
    application (the existing "Select" action), which also means the brand
    chose this creator.
    """
    if conv.price_type == PRICE_NEGOTIABLE:
        return True  # negotiating needs an open conversation
    if conv.chat_permission_granted:
        return True
    if conv.brand_decision == DECISION_SELECTED or has_contract:
        return True
    return (application.status or "").lower() in COLLABORATING_APPLICATION_STATUSES


@dataclass
class SendDecision:
    allowed: bool
    reason: Optional[str] = None
    used: int = 0
    remaining: Optional[int] = None  # None = unlimited


def evaluate_send(db: Session, conv: Conversation, application: Application, user) -> SendDecision:
    """Single source of truth for 'may this user send a message right now?'."""
    used = creator_message_count(db, conv)
    is_creator = user.id == conv.creator_id
    has_contract = (
        db.query(Contract.id).filter(Contract.application_id == application.id).first() is not None
    )
    limited = is_creator and not creator_has_open_chat(conv, application, has_contract)
    remaining = max(0, FIXED_PRICE_CREATOR_MESSAGE_LIMIT - used) if limited else None

    if is_closed(conv, application):
        return SendDecision(False, BLOCK_CLOSED, used, remaining)
    if getattr(user, "is_restricted", False) and user.role != "admin":
        return SendDecision(False, BLOCK_RESTRICTED, used, remaining)
    if limited and used >= FIXED_PRICE_CREATOR_MESSAGE_LIMIT:
        return SendDecision(False, BLOCK_LIMIT, used, remaining)
    return SendDecision(True, None, used, remaining)


def get_or_create_conversation(db: Session, application: Application, campaign: Campaign) -> Conversation:
    conv = db.query(Conversation).filter(Conversation.application_id == application.id).first()
    if conv:
        return conv
    price_type = derive_price_type(getattr(campaign, "price_type", None), campaign.compensation_type)
    conv = Conversation(
        application_id=application.id,
        campaign_id=campaign.id,
        business_id=campaign.business_id,
        creator_id=application.creator_id,
        price_type=price_type,
        negotiation_status=NEG_OPEN if price_type == PRICE_NEGOTIABLE else NEG_NONE,
        brand_decision=DECISION_PENDING,
        chat_permission_granted=False,
        is_closed=False,
    )
    db.add(conv)
    db.flush()
    log_event(db, conv, None, "conversation_created", {"price_type": price_type})
    return conv


def agreed_totals(conv: Conversation, campaign: Campaign) -> dict:
    """Agreed creator compensation, plus the separate 10% platform fee the
    brand pays CreatorHub (never deducted from the creator)."""
    if conv.agreed_amount is None:
        return {"agreed_amount": None, "agreed_total": None, "platform_fee": None, "platform_fee_rate": campaign_fee_rate(campaign)}
    amount = float(conv.agreed_amount)
    total = total_for_rate(amount, campaign)
    rate = campaign_fee_rate(campaign)
    return {
        "agreed_amount": amount,
        "agreed_total": total,
        "platform_fee": platform_fee_for(total, rate),
        "platform_fee_rate": rate,
    }