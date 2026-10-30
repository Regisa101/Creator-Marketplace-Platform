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
# Automated reply from the CreatorHub assistant (no human sender).
KIND_ASSISTANT = "assistant"
# A preset ("quick reply") message the user picked from a list.
KIND_QUICK = "quick"
# Automatic greeting sent on the brand's behalf when a creator first says hi.
KIND_AUTO = "auto"

# Application status: the creator asked for a price outside the brand's
# budget range and has not yet answered the assistant. The application is
# hidden from the brand until the creator agrees to a price inside the range.
STATUS_RANGE_REVIEW = "range_review"
# The creator said no to the brand's budget range. Never shown to the brand.
STATUS_RANGE_DECLINED = "range_declined"

# Application statuses that end all messaging. Nothing in the codebase
# reopens these, and no reopening endpoint exists.
CLOSED_APPLICATION_STATUSES = ("rejected", "withdrawn", "range_declined")
# Application statuses that mean the creator is working with the brand.
COLLABORATING_APPLICATION_STATUSES = ("selected", "accepted", "completed")

# Reasons returned to the client when sending is blocked.
BLOCK_CLOSED = "closed"
BLOCK_LIMIT = "message_limit_reached"
BLOCK_RESTRICTED = "account_restricted"


def budget_range(campaign: Campaign) -> Optional[tuple[float, float]]:
    """The brand's (min, max) range for a negotiable campaign, else None."""
    lo = getattr(campaign, "budget_min", None)
    hi = getattr(campaign, "budget_max", None)
    if lo is None or hi is None or float(lo) <= 0 or float(hi) < float(lo):
        return None
    return float(lo), float(hi)


def outside_range(amount: float, rng: tuple[float, float]) -> bool:
    return float(amount) < rng[0] or float(amount) > rng[1]


def range_prompt_text(amount: float, rng: tuple[float, float]) -> str:
    return (
        f"Hi! This is the CreatorHub assistant. The brand's budget range for this "
        f"campaign is NPR {rng[0]:,.0f} – {rng[1]:,.0f}. Your price of NPR {amount:,.0f} "
        f"is outside that range. Would you like to continue within it?"
    )


RANGE_SORRY_TEXT = (
    "Sorry, we couldn't agree on a price for this campaign. "
    "Thank you for your interest, and we hope you find a great match soon."
)


# ------------------------------------------------------------
# GUIDED CHAT (before the deal is sealed)
# ------------------------------------------------------------
# Until the brand selects the creator (or a contract exists, or the brand
# explicitly allows further chat) neither side can type free text. They pick
# from these preset messages instead. Keys are validated on the server, so
# the text can never be forged by the client.
#
#   key -> (button label, message text, only_for_negotiable)
CREATOR_QUICK_REPLIES = {
    "hi": ("Say hi", "Hi! I'm interested in this campaign.", False),
    "details": ("Ask for details", "Could you tell me more about the campaign details?", False),
    "deliverables": ("Ask about deliverables", "Could you confirm exactly what deliverables you need?", False),
    "timeline": ("Ask about timeline", "What is the expected timeline for this collaboration?", False),
    "available": ("I'm available", "I'm available and ready to start.", False),
}
BRAND_QUICK_REPLIES = {
    "hello": ("Send greeting", "Hello! Thanks for your interest in {title}. How can I help you?", False),
    "negotiate": ("Start negotiation", "Let's talk about the price. Please send your offer{range}.", True),
    "details": ("Share details", "You can find the deliverables and timeline in the campaign details.", False),
    "reviewing": ("We're reviewing", "Thanks! We're reviewing applications and will get back to you soon.", False),
}

AUTO_GREETING_TEXT = "Hello! Thanks for your interest in {title}. How can I help you?"
BLOCK_GUIDED = "guided"


def is_free_chat(conv: Conversation, application: Application, has_contract: bool = False) -> bool:
    """True once free typing is allowed: the brand selected the creator, a
    contract exists, or the brand explicitly allowed further chat."""
    if conv.chat_permission_granted:
        return True
    if conv.brand_decision == DECISION_SELECTED or has_contract:
        return True
    return (application.status or "").lower() in COLLABORATING_APPLICATION_STATUSES


def quick_replies_for(role: str, price_type: str) -> list[dict]:
    catalogue = CREATOR_QUICK_REPLIES if role == "creator" else BRAND_QUICK_REPLIES
    return [
        {"key": key, "label": label}
        for key, (label, _text, negotiable_only) in catalogue.items()
        if not negotiable_only or price_type == PRICE_NEGOTIABLE
    ]


def quick_reply_text(role: str, key: str, price_type: str, campaign: Campaign) -> Optional[str]:
    catalogue = CREATOR_QUICK_REPLIES if role == "creator" else BRAND_QUICK_REPLIES
    entry = catalogue.get(key)
    if not entry or (entry[2] and price_type != PRICE_NEGOTIABLE):
        return None
    rng = budget_range(campaign)
    range_text = f" within the budget range of NPR {rng[0]:,.0f} – {rng[1]:,.0f}" if rng else ""
    return entry[1].format(title=campaign.title, range=range_text)


def maybe_send_auto_greeting(db: Session, conv: Conversation, campaign: Campaign) -> Optional[Message]:
    """First time a creator speaks, the brand side greets them automatically.
    Skipped if the brand has already said anything in this conversation."""
    brand_spoke = (
        db.query(Message.id)
        .filter(
            Message.conversation_id == conv.id,
            Message.sender_id == conv.business_id,
            Message.kind.in_((KIND_AUTO, KIND_QUICK, KIND_USER)),
        )
        .first()
    )
    if brand_spoke:
        return None
    msg = Message(
        conversation_id=conv.id,
        sender_id=conv.business_id,
        kind=KIND_AUTO,
        body=AUTO_GREETING_TEXT.format(title=campaign.title),
        is_read=False,
    )
    db.add(msg)
    db.flush()
    return msg


def add_assistant_message(db: Session, conv: Conversation, body: str) -> Message:
    msg = Message(conversation_id=conv.id, sender_id=None, kind=KIND_ASSISTANT, body=body, is_read=False)
    db.add(msg)
    db.flush()
    return msg


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
    has_contract = (
        db.query(Contract.id).filter(Contract.application_id == application.id).first() is not None
    )
    remaining = None  # the old 2-message allowance is replaced by guided chat

    if is_closed(conv, application):
        return SendDecision(False, BLOCK_CLOSED, used, remaining)
    if getattr(user, "is_restricted", False) and user.role != "admin":
        return SendDecision(False, BLOCK_RESTRICTED, used, remaining)
    # Before the deal is sealed nobody types freely; they use quick replies.
    if not is_free_chat(conv, application, has_contract):
        return SendDecision(False, BLOCK_GUIDED, used, remaining)
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