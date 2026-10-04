from sqlalchemy import Column, DateTime, ForeignKey, Integer, JSON, String, Text, Index
from sqlalchemy.sql import func

from app.database import Base


class Complaint(Base):
    """A private report filed by a creator or business.

    target_type is one of:
      - "user":     against another user (target_user_id)
      - "campaign": against a campaign (target_campaign_id; target_user_id is
                    set to the campaign owner so complaints add up per owner)
      - "platform": against CreatorHub itself (no target)

    Complaints are only visible to the reporter (their own) and to admins.
    """

    __tablename__ = "complaints"

    id = Column(Integer, primary_key=True, index=True)
    reporter_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)

    target_type = Column(String(20), nullable=False, index=True)
    target_user_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    target_campaign_id = Column(Integer, ForeignKey("campaigns.id"), nullable=True, index=True)
    contract_id = Column(Integer, ForeignKey("contracts.id"), nullable=True)

    category = Column(String(50), nullable=False, index=True)
    description = Column(Text, nullable=False)
    evidence_urls = Column(JSON, nullable=True)

    # new -> under_review -> upheld | dismissed
    status = Column(String(20), nullable=False, default="new", server_default="new", index=True)
    admin_note = Column(Text, nullable=True)
    reviewed_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    reviewed_at = Column(DateTime(timezone=True), nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    __table_args__ = (
        Index("ix_complaints_target_status", "target_user_id", "status"),
    )