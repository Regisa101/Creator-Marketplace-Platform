from sqlalchemy import Column, Integer, String, DECIMAL, DateTime, ForeignKey, Text, JSON
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database import Base


class Contract(Base):
    __tablename__ = "contracts"

    id = Column(Integer, primary_key=True, index=True)
    campaign_id = Column(Integer, ForeignKey("campaigns.id"), nullable=False, index=True)
    application_id = Column(Integer, ForeignKey("applications.id"), nullable=False, unique=True, index=True)
    business_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    creator_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)

    engagement_type = Column(String(50), nullable=True)
    duration = Column(String(100), nullable=True)
    pricing_model = Column(String(50), nullable=True)
    compensation_type = Column(String(50), nullable=True)
    compensation_description = Column(Text, nullable=True)

    # Final agreed compensation. For monthly/hourly contracts this is the
    # rate. For one-time contracts it is the total contract value.
    agreed_rate = Column(DECIMAL(12, 2), nullable=True)
    total_value = Column(DECIMAL(12, 2), nullable=True)

    platform_fee_rate = Column(DECIMAL(5, 4), nullable=False, default=0.10)
    platform_fee_amount = Column(DECIMAL(12, 2), nullable=True)

    start_date = Column(DateTime(timezone=True), nullable=True)
    end_date = Column(DateTime(timezone=True), nullable=True)

    # draft -> pending_payment -> active -> completed | cancelled
    #
    # A contract sits in "pending_payment" the moment the business finalizes
    # terms (agreed_rate / total_value / platform_fee_amount get set), and
    # stays there until the 10% platform fee is paid through the (demo)
    # payment endpoint. Only then does it flip to "active".
    status = Column(String(30), nullable=False, default="draft", index=True)
    terms_note = Column(Text, nullable=True)

    # Immutable evidence captured when the collaboration contract is created.
    # This preserves what the parties agreed to even if the live campaign is
    # edited, closed, or later removed.
    evidence_snapshot = Column(JSON, nullable=True)

    # Verified platform-fee checkout metadata.
    payment_method = Column(String(30), nullable=True)
    # Provider transaction reference returned after successful verification.
    payment_reference = Column(String(64), nullable=True)
    fee_paid_at = Column(DateTime(timezone=True), nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    campaign = relationship("Campaign")
    application = relationship("Application")
    business = relationship("User", foreign_keys=[business_id])
    creator = relationship("User", foreign_keys=[creator_id])