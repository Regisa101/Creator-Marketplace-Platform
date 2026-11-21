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
from decimal import Decimal
from typing import NamedTuple, Optional

from sqlalchemy.orm import Session

from app.models import Application, Campaign, Contract, Conversation, ConversationEvent, Message, PriceOffer
from app.services.notifications import create_notification
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
# A plain creator message about price that is not an offer card (a price outside
# the budget range, a fixed-price proposal, "No thanks"). Shown to both sides.
KIND_HELD = "held"

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


def money_text(amount: float) -> str:
    """NPR 34,000 (no trailing .00 for whole amounts)."""
    value = float(amount)
    return f"NPR {value:,.0f}" if value == int(value) else f"NPR {value:,.2f}"


def price_line(amount: float) -> str:
    """How a typed price reads in the chat: like any normal message."""
    return f"My offer: {money_text(amount)}"


def range_prompt_text(amount: float, rng: tuple[float, float]) -> str:
    # Written in the brand's own voice; it is sent automatically on its behalf.
    return (
        f"Hi! The budget range for this campaign is NPR {rng[0]:,.0f} – {rng[1]:,.0f}. "
        f"Your price of {money_text(amount)} is outside that range. "
        f"Would you like to continue within it?"
    )


RANGE_DECLINE_TEXT = "No thanks."

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
# The creator's side is a short script:
#
#   1. greet    -> "Say hi" is the only button. The brand side greets back
#                  automatically.
#   2. inquire  -> three buttons: deliverables, deadline/timeline and (on
#                  negotiable campaigns) "Negotiate price". Each one is
#                  answered automatically on the brand's behalf, using the
#                  data the brand entered on the campaign. Choosing
#                  "Negotiate price" is what unlocks the typed-amount box.
#
# The brand keeps its own preset buttons for manual replies.
STAGE_GREET = "greet"
STAGE_INQUIRE = "inquire"


class QuickReply(NamedTuple):
    label: str
    text: str
    negotiable_only: bool = False
    stage: Optional[str] = None  # creator-only: which step of the script it belongs to


CREATOR_QUICK_REPLIES: dict[str, QuickReply] = {
    "hi": QuickReply("Say hi", "Hi! I'm interested in this campaign.", False, STAGE_GREET),
    "deliverables": QuickReply(
        "Ask about deliverables", "Could you confirm exactly what deliverables you need?", False, STAGE_INQUIRE
    ),
    "timeline": QuickReply(
        "Ask about deadline", "What is the deadline and expected timeline for this collaboration?", False, STAGE_INQUIRE
    ),
    "negotiate": QuickReply(
        "Negotiate price", "I'd like to negotiate the price for this campaign.", True, STAGE_INQUIRE
    ),
}
BRAND_QUICK_REPLIES: dict[str, QuickReply] = {
    "hello": QuickReply("Send greeting", "Hello! Thanks for your interest in {title}. How can I help you?"),
    "negotiate": QuickReply(
        "Start negotiation", "Let's talk about the price. Please send your offer{range}.", True
    ),
    "details": QuickReply("Share details", "You can find the deliverables and timeline in the campaign details."),
    "reviewing": QuickReply("We're reviewing", "Thanks! We're reviewing applications and will get back to you soon."),
}

AUTO_GREETING_TEXT = "Hello! Thanks for your interest in {title}. How can I help you?"
BLOCK_GUIDED = "guided"

EVENT_QUICK_REPLY = "quick_reply"
EVENT_NEGOTIATION_STARTED = "negotiation_started"

_ENGAGEMENT_LABELS = {
    "one_time": "One-time project",
    "one-time": "One-time project",
    "short_term": "Short-term",
    "short-term": "Short-term",
    "long_term": "Long-term",
    "long-term": "Long-term",
    "weekly": "Weekly",
    "monthly": "Monthly",
    "yearly": "Yearly",
}
MAX_AUTO_TEXT = 400  # long free-text campaign fields are trimmed in auto-replies


def is_free_chat(conv: Conversation, application: Application, has_contract: bool = False) -> bool:
    """True once free typing is allowed: the brand selected the creator, a
    contract exists, or the brand explicitly allowed further chat."""
    if conv.chat_permission_granted:
        return True
    if conv.brand_decision == DECISION_SELECTED or has_contract:
        return True
    return (application.status or "").lower() in COLLABORATING_APPLICATION_STATUSES


# ---- conversation state derived from the audit trail (no extra columns) ----
def creator_has_spoken(db: Session, conv: Conversation) -> bool:
    return (
        db.query(Message.id)
        .filter(
            Message.conversation_id == conv.id,
            Message.sender_id == conv.creator_id,
            Message.kind.in_((KIND_QUICK, KIND_USER)),
        )
        .first()
        is not None
    )


def used_quick_keys(db: Session, conv: Conversation, role: str) -> set[str]:
    """Preset keys this side already sent (creator inquiries are one-shot)."""
    events = (
        db.query(ConversationEvent.data)
        .filter(ConversationEvent.conversation_id == conv.id, ConversationEvent.event_type == EVENT_QUICK_REPLY)
        .all()
    )
    return {
        (d or {}).get("key")
        for (d,) in events
        if (d or {}).get("role") == role and (d or {}).get("key")
    }


def negotiation_started(db: Session, conv: Conversation) -> bool:
    """True once price talk has been opened (by the creator's "Negotiate
    price" or the brand's "Start negotiation"). Conversations that already
    hold an offer from before this rule existed count as started."""
    if conv.price_type != PRICE_NEGOTIABLE:
        return False
    if (
        db.query(ConversationEvent.id)
        .filter(ConversationEvent.conversation_id == conv.id, ConversationEvent.event_type == EVENT_NEGOTIATION_STARTED)
        .first()
    ):
        return True
    return db.query(PriceOffer.id).filter(PriceOffer.conversation_id == conv.id).first() is not None


def quick_reply_error(db: Session, conv: Conversation, role: str, key: str) -> Optional[str]:
    """Why this preset cannot be sent right now, or None when it can.
    This is the server-side enforcement of the creator's script."""
    catalogue = CREATOR_QUICK_REPLIES if role == "creator" else BRAND_QUICK_REPLIES
    entry = catalogue.get(key)
    if entry is None or (entry.negotiable_only and conv.price_type != PRICE_NEGOTIABLE):
        return "That quick reply is not available."
    if key == "negotiate" and (conv.negotiation_status != NEG_OPEN or negotiation_started(db, conv)):
        return "Price negotiation is already open." if conv.negotiation_status == NEG_OPEN else "The price is already agreed."
    if role == "creator":
        spoken = creator_has_spoken(db, conv)
        if entry.stage == STAGE_GREET and spoken:
            return "You have already said hi."
        if entry.stage == STAGE_INQUIRE and not spoken:
            return "Say hi first."
        if key in used_quick_keys(db, conv, "creator"):
            return "You have already asked that."
    return None


def quick_replies_for(db: Session, conv: Conversation, role: str) -> list[dict]:
    """The buttons to show this side right now."""
    return [
        {"key": key, "label": entry.label}
        for key, entry in (CREATOR_QUICK_REPLIES if role == "creator" else BRAND_QUICK_REPLIES).items()
        if quick_reply_error(db, conv, role, key) is None
    ]


def quick_reply_text(role: str, key: str, price_type: str, campaign: Campaign) -> Optional[str]:
    catalogue = CREATOR_QUICK_REPLIES if role == "creator" else BRAND_QUICK_REPLIES
    entry = catalogue.get(key)
    if not entry or (entry.negotiable_only and price_type != PRICE_NEGOTIABLE):
        return None
    rng = budget_range(campaign)
    range_text = f" within the budget range of NPR {rng[0]:,.0f} – {rng[1]:,.0f}" if rng else ""
    return entry.text.format(title=campaign.title, range=range_text)


# ---- automatic brand replies, built from the campaign data in the database ----
def _clip(text: str, limit: int = MAX_AUTO_TEXT) -> str:
    text = " ".join(str(text).split())
    return text if len(text) <= limit else text[: limit - 1].rstrip() + "…"


def _fmt_date(value) -> Optional[str]:
    return value.strftime("%d %b %Y") if value else None


def deliverables_reply(campaign: Campaign) -> str:
    items = [str(x).strip() for x in (campaign.deliverables or []) if str(x).strip()]
    lines: list[str] = []
    if items:
        lines.append(f"Here's what we need for {campaign.title}:")
        lines += [f"• {item}" for item in items]
    responsibilities = (campaign.responsibilities or "").strip()
    if responsibilities:
        lines.append(f"What you'd do: {_clip(responsibilities)}")
    if not lines:
        return (
            f"We haven't listed specific deliverables for {campaign.title} yet. "
            "Please check the campaign details."
        )
    needed = campaign.creators_needed or 1
    if needed > 1:
        lines.append(f"We're looking for {needed} creators.")
    return "\n".join(lines)


def timeline_reply(campaign: Campaign) -> str:
    rows: list[str] = []
    applications_close = _fmt_date(campaign.application_deadline)
    starts, ends = _fmt_date(campaign.start_date), _fmt_date(campaign.end_date)
    if applications_close:
        rows.append(f"• Application deadline: {applications_close}")
    if starts:
        rows.append(f"• Campaign starts: {starts}")
    if ends:
        rows.append(f"• Campaign ends (final deadline): {ends}")
    if campaign.duration:
        rows.append(f"• Duration: {campaign.duration}")
    engagement = (campaign.engagement_type or "").strip()
    if engagement:
        rows.append(f"• Type: {_ENGAGEMENT_LABELS.get(engagement.lower(), engagement.replace('_', ' ').capitalize())}")
    if not rows:
        return (
            f"We haven't set dates for {campaign.title} yet. "
            "Please check the campaign details, or ask again later."
        )
    return "\n".join([f"Here's the timeline for {campaign.title}:", *rows])


def negotiation_reply(campaign: Campaign) -> str:
    rng = budget_range(campaign)
    budget = campaign.budget
    parts = ["Happy to talk price!"]
    if budget is not None and float(budget) > 0:
        parts.append(f"The starting budget is NPR {float(budget):,.0f}.")
    if rng:
        parts.append(f"Our budget range is NPR {rng[0]:,.0f} – {rng[1]:,.0f}.")
    parts.append("Please enter your offer below.")
    return " ".join(parts)


def _auto_message(db: Session, conv: Conversation, body: str) -> Message:
    msg = Message(conversation_id=conv.id, sender_id=conv.business_id, kind=KIND_AUTO, body=body, is_read=False)
    db.add(msg)
    db.flush()
    return msg


def auto_reply_for(db: Session, conv: Conversation, campaign: Campaign, key: str) -> Optional[Message]:
    """The brand side answers a creator's preset automatically."""
    if key == "hi":
        return maybe_send_auto_greeting(db, conv, campaign)
    if key == "deliverables":
        return _auto_message(db, conv, deliverables_reply(campaign))
    if key == "timeline":
        return _auto_message(db, conv, timeline_reply(campaign))
    if key == "negotiate":
        return _auto_message(db, conv, negotiation_reply(campaign))
    return None


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
    return _auto_message(db, conv, AUTO_GREETING_TEXT.format(title=campaign.title))


FIXED_PRICE_SORRY_TEXT = (
    "Sorry, this campaign has a fixed price{amount}, so a different price can't be proposed. "
    "Your application continues at our fixed price."
)


def fixed_price_sorry_text(campaign: Campaign) -> str:
    budget = getattr(campaign, "budget", None)
    amount = f" of NPR {float(budget):,.0f}" if budget is not None and float(budget) > 0 else ""
    return FIXED_PRICE_SORRY_TEXT.format(amount=amount)


def add_held_message(db: Session, conv: Conversation, creator_id: int, text: str) -> Message:
    """A plain creator message that is not a price offer card: a price outside
    the range or on a fixed-price campaign, or a "No thanks" to the range
    question. Both sides see it like any other message."""
    msg = Message(conversation_id=conv.id, sender_id=creator_id, kind=KIND_HELD, body=text, is_read=False)
    db.add(msg)
    db.flush()
    return msg


def add_creator_offer(db: Session, conv: Conversation, creator_id: int, amount: float, via: str = "chat") -> PriceOffer:
    """Creator's price as a pending offer card the brand can accept or counter."""
    value = Decimal(str(amount)).quantize(Decimal("0.01"))
    offer = PriceOffer(conversation_id=conv.id, proposer_id=creator_id, amount=value, status="pending")
    db.add(offer)
    db.flush()
    db.add(Message(
        conversation_id=conv.id, sender_id=creator_id, kind=KIND_OFFER, offer_id=offer.id,
        body=f"Offered NPR {value:,.2f}", is_read=False,
    ))
    log_event(db, conv, creator_id, "offer_made", {"offer_id": offer.id, "amount": float(value), "via": via})
    return offer


def seed_application_chat(
    db: Session, conv: Conversation, application: Application, campaign: Campaign,
    creator_id: int, typed_rate: Optional[float],
) -> bool:
    """Called when a creator applies. The chat exists from that moment (so the
    creator can say hi right away) and the price they proposed on the form
    appears in it:

    * negotiable, inside the brand's range (or no range) -> a pending offer card
    * negotiable, outside the range -> held from the brand; the assistant asks
      the creator whether to continue within the range
    * fixed price -> held; the assistant says sorry (the fixed price stands)

    Returns True when the application must be held for range review.
    """
    if typed_rate is None:
        return False
    if conv.price_type == PRICE_NEGOTIABLE:
        rng = budget_range(campaign)
        if rng and outside_range(typed_rate, rng):
            add_held_message(db, conv, creator_id, price_line(typed_rate))
            add_assistant_message(db, conv, range_prompt_text(typed_rate, rng))
            log_event(db, conv, creator_id, "range_prompt", {"amount": typed_rate, "min": rng[0], "max": rng[1]})
            return True
        offer = add_creator_offer(db, conv, creator_id, typed_rate, via="application")
        auto_negotiate(db, conv, application, campaign, offer)
        return False
    # fixed price
    fixed = getattr(campaign, "budget", None)
    if fixed is not None and abs(float(fixed) - typed_rate) < 0.01:
        return False  # they simply typed the fixed price: nothing to apologise for
    add_held_message(db, conv, creator_id, price_line(typed_rate))
    add_assistant_message(db, conv, fixed_price_sorry_text(campaign))
    log_event(db, conv, creator_id, "fixed_price_sorry", {"amount": typed_rate})
    return False


def add_assistant_message(db: Session, conv: Conversation, body: str) -> Message:
    # Sent "by the brand": the brand's side of the chat for both parties.
    msg = Message(conversation_id=conv.id, sender_id=conv.business_id, kind=KIND_ASSISTANT, body=body, is_read=False)
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


# ------------------------------------------------------------
# AUTOMATIC NEGOTIATION (the brand side of the chat)
# ------------------------------------------------------------
# On a negotiable campaign with a budget range, the brand's side of the chat
# haggles for it:
#
#   * the brand's floor is the range minimum
#   * when the creator asks for more than the floor, the brand counters part of
#     the way up from the floor: 20% of the gap on the first counter, 30% on the
#     second (range 50,000 - 60,000, creator asks 60,000: "let's deal at
#     52,000", then "53,000")
#   * it counters at most AUTO_COUNTER_ROUNDS times. If the creator still
#     insists after that, the brand accepts the creator's price
#   * it also accepts straight away when the creator asks for the floor (or
#     less than the last counter), or when a counter would not be lower than
#     what the creator asked
#
# Accepting only records the agreed price. The brand still decides whether to
# select the creator. Once the brand types an offer or declines one itself,
# the automation stays out of the way.
AUTO_COUNTER_ROUNDS = 2
AUTO_COUNTER_SHARES = (0.20, 0.30)  # share of (creator price - floor) per round
EVENT_AUTO_COUNTER = "auto_counter"
EVENT_AUTO_ACCEPT = "auto_accept"


def display_name(user) -> str:
    if not user:
        return "Unknown"
    prof = getattr(user, "profile", None) or {}
    return prof.get("display_name") or prof.get("company_name") or user.full_name or "User"


def record_agreement(db: Session, conv: Conversation, application: Application, campaign: Campaign, actor, offer: PriceOffer) -> None:
    """Common tail of 'a price was agreed'. Does NOT select the creator, sign
    or activate anything; the brand still has to choose."""
    conv.negotiation_status = NEG_PRICE_AGREED
    conv.agreed_amount = offer.amount
    # Prefills the contract draft later.
    application.rate = offer.amount

    totals = agreed_totals(conv, campaign)
    rate, total = totals["agreed_amount"], totals["agreed_total"]
    months = round(total / rate) if rate else 1
    # A monthly rate is spelled out so the total never appears out of nowhere.
    how = (
        f"{money_text(rate)} per month × {months} months = {money_text(total)}"
        if months > 1 and abs(total - rate) > 0.01
        else money_text(total)
    )
    add_system_message(
        db, conv,
        f"Price agreed: {how} creator compensation. "
        "Waiting for the brand to decide whether to select this creator.",
    )
    log_event(db, conv, actor.id, "price_agreed", {"offer_id": offer.id, "amount": float(offer.amount)})

    create_notification(
        db, user_id=conv.business_id, type="price_agreed", title="Price agreed - choose your creator",
        message=(
            f"{display_name(conv.creator)} and you agreed on NPR {totals['agreed_total']:,.2f} for "
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


def _auto_counters(db: Session, conv: Conversation) -> list[dict]:
    rows = (
        db.query(ConversationEvent.data)
        .filter(ConversationEvent.conversation_id == conv.id, ConversationEvent.event_type == EVENT_AUTO_COUNTER)
        .order_by(ConversationEvent.id.asc())
        .all()
    )
    return [d or {} for (d,) in rows]


def brand_took_over(db: Session, conv: Conversation) -> bool:
    """True once the brand negotiates by hand (types its own offer or declines
    one), so the automation never talks over a person."""
    auto_ids = {c.get("offer_id") for c in _auto_counters(db, conv)}
    manual_offer = (
        db.query(PriceOffer.id)
        .filter(
            PriceOffer.conversation_id == conv.id,
            PriceOffer.proposer_id == conv.business_id,
            PriceOffer.id.notin_(auto_ids) if auto_ids else True,
            PriceOffer.status != "accepted",  # "creator accepted the listed price" is not a manual counter
        )
        .first()
    )
    if manual_offer:
        return True
    return (
        db.query(ConversationEvent.id)
        .filter(
            ConversationEvent.conversation_id == conv.id,
            ConversationEvent.event_type == "offer_declined",
            ConversationEvent.actor_id == conv.business_id,
        )
        .first()
        is not None
    )


def next_counter(floor: float, ceiling: float, price: float, last_counter: Optional[float], round_index: int) -> float:
    """The brand's next counter: part of the way from the floor up to the
    creator's price, never below its previous counter."""
    share = AUTO_COUNTER_SHARES[min(round_index, len(AUTO_COUNTER_SHARES) - 1)]
    step = 100 if ceiling >= 5000 else 10  # tidy, human-looking numbers
    counter = round((floor + (price - floor) * share) / step) * step
    if last_counter is not None:
        counter = max(counter, last_counter)
    return float(max(counter, floor))


def _auto_say(db: Session, conv: Conversation, body: str, offer: Optional[PriceOffer] = None) -> Message:
    msg = Message(
        conversation_id=conv.id, sender_id=conv.business_id, kind=KIND_ASSISTANT, body=body,
        offer_id=offer.id if offer else None, is_read=False,
    )
    db.add(msg)
    db.flush()
    return msg


def auto_negotiate(db: Session, conv: Conversation, application: Application, campaign: Campaign, offer: PriceOffer) -> bool:
    """The brand side answers a creator's in-range offer. Returns True when it acted."""
    if (
        conv.price_type != PRICE_NEGOTIABLE
        or conv.negotiation_status != NEG_OPEN
        or conv.brand_decision != DECISION_PENDING
        or is_closed(conv, application)
        or offer.proposer_id != conv.creator_id
        or offer.status != "pending"
    ):
        return False
    rng = budget_range(campaign)
    if not rng or brand_took_over(db, conv):
        return False

    floor, ceiling = rng
    price = float(offer.amount)
    counters = _auto_counters(db, conv)
    last = float(counters[-1]["amount"]) if counters else None

    counter = None
    accept = price <= floor or (last is not None and price <= last) or len(counters) >= AUTO_COUNTER_ROUNDS
    if not accept:
        counter = next_counter(floor, ceiling, price, last, len(counters))
        accept = counter >= price  # nothing left to haggle over

    if accept:
        offer.status = "accepted"
        offer.responded_at = now()
        if price <= floor:
            _auto_say(db, conv, f"That works for us! Let's go with {money_text(price)}.")
        else:
            _auto_say(db, conv, f"Alright, you've got a deal at {money_text(price)}!")
        log_event(db, conv, conv.business_id, EVENT_AUTO_ACCEPT, {"offer_id": offer.id, "amount": price})
        record_agreement(db, conv, application, campaign, conv.business, offer)
        return True

    offer.status = "superseded"
    offer.responded_at = now()
    value = Decimal(str(counter)).quantize(Decimal("0.01"))
    counter_offer = PriceOffer(conversation_id=conv.id, proposer_id=conv.business_id, amount=value, status="pending")
    db.add(counter_offer)
    db.flush()
    if not counters:
        text = f"Thanks for your offer of {money_text(price)}! Let's deal at {money_text(counter)}."
    elif counter <= last:
        text = f"{money_text(counter)} is the best we can do. Let's deal at that."
    else:
        text = f"We can stretch a little: let's deal at {money_text(counter)}."
    _auto_say(db, conv, text, counter_offer)
    log_event(db, conv, conv.business_id, EVENT_AUTO_COUNTER, {
        "offer_id": counter_offer.id, "amount": counter, "round": len(counters) + 1, "against": offer.id,
    })
    create_notification(
        db, user_id=conv.creator_id, type="price_counter", title="Counter offer",
        message=f"The brand suggested {money_text(counter)} for {campaign.title}.",
        link=f"/messages?c={conv.id}", reference_id=conv.id, event_key=f"auto-counter:{conv.id}:{counter_offer.id}",
    )
    return True