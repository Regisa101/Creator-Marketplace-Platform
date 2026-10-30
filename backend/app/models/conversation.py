from sqlalchemy import (
    Boolean, Column, DateTime, DECIMAL, ForeignKey, Index, Integer, JSON, String, Text,
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.database import Base


class Conversation(Base):
    """One conversation per application.

    State is deliberately split into independent fields (never one combined
    status column):

    * application status      -> applications.status (pending/selected/accepted/rejected/withdrawn)
    * negotiation_status      -> none | open | price_agreed        (negotiable campaigns only)
    * brand_decision          -> pending | selected | not_selected (negotiable post-agreement decision)
    * chat_permission_granted -> brand allowed further chat        (fixed-price applications)
    * is_closed               -> conversation no longer accepts messages
    """

    __tablename__ = "conversations"

    id = Column(Integer, primary_key=True, index=True)
    application_id = Column(Integer, ForeignKey("applications.id"), nullable=False, unique=True, index=True)
    campaign_id = Column(Integer, ForeignKey("campaigns.id"), nullable=False, index=True)
    business_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    creator_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)

    # Snapshot of campaigns.price_type when the conversation was created.
    price_type = Column(String(20), nullable=False, default="fixed")

    negotiation_status = Column(String(20), nullable=False, default="none")
    agreed_amount = Column(DECIMAL(12, 2), nullable=True)

    brand_decision = Column(String(20), nullable=False, default="pending")
    decided_at = Column(DateTime(timezone=True), nullable=True)

    chat_permission_granted = Column(Boolean, nullable=False, default=False)
    chat_permission_granted_at = Column(DateTime(timezone=True), nullable=True)

    is_closed = Column(Boolean, nullable=False, default=False)
    closed_reason = Column(String(40), nullable=True)
    closed_at = Column(DateTime(timezone=True), nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    application = relationship("Application")
    campaign = relationship("Campaign")
    business = relationship("User", foreign_keys=[business_id])
    creator = relationship("User", foreign_keys=[creator_id])


class Message(Base):
    """kind = user (typed by a person) | system (status line) | offer (price offer card)."""

    __tablename__ = "messages"

    id = Column(Integer, primary_key=True, index=True)
    conversation_id = Column(Integer, ForeignKey("conversations.id"), nullable=False)
    sender_id = Column(Integer, ForeignKey("users.id"), nullable=True)  # NULL for system messages
    kind = Column(String(10), nullable=False, default="user")
    body = Column(Text, nullable=False)
    offer_id = Column(Integer, ForeignKey("price_offers.id"), nullable=True)
    is_read = Column(Boolean, nullable=False, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (Index("ix_messages_conversation_id_id", "conversation_id", "id"),)


class PriceOffer(Base):
    """status = pending | accepted | declined | superseded"""

    __tablename__ = "price_offers"

    id = Column(Integer, primary_key=True, index=True)
    conversation_id = Column(Integer, ForeignKey("conversations.id"), nullable=False, index=True)
    proposer_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    amount = Column(DECIMAL(12, 2), nullable=False)
    status = Column(String(12), nullable=False, default="pending")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    responded_at = Column(DateTime(timezone=True), nullable=True)


class ConversationEvent(Base):
    """Append-only audit trail. Never deleted, even when a conversation closes."""

    __tablename__ = "conversation_events"

    id = Column(Integer, primary_key=True, index=True)
    conversation_id = Column(Integer, ForeignKey("conversations.id"), nullable=False, index=True)
    actor_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    event_type = Column(String(40), nullable=False)
    data = Column(JSON, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())