from sqlalchemy import Column, Integer, String, Text, DateTime, DECIMAL, ForeignKey, JSON, Boolean
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database import Base

class Application(Base):
    __tablename__ = "applications"
    
    id = Column(Integer, primary_key=True, index=True)
    campaign_id = Column(Integer, ForeignKey("campaigns.id"), nullable=False)
    creator_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    proposal = Column(Text, nullable=False)
    rate = Column(DECIMAL(10,2), nullable=True)

    # Fixed campaign compensation. `agreed_rate` mirrors the locked amount
    # that was established from the campaign budget before work begins.
    agreed_rate = Column(DECIMAL(10,2), nullable=True)
    rate_locked = Column(Integer, nullable=False, default=0)
    message = Column(Text, nullable=True)

    # Answers to campaign-specific application questions and the portfolio
    # items the creator chose to show the brand. Stored as JSON so this can
    # evolve without another table for every new question type.
    application_answers = Column(JSON, nullable=True)
    selected_portfolio = Column(JSON, nullable=True)

    # Optional collaboration-specific deadline. If blank, the campaign
    # deliverable deadline is used.
    deliverable_deadline = Column(DateTime(timezone=True), nullable=True)
    
    # Status: pending, accepted, rejected, withdrawn
    status = Column(String(50), default="pending")

    # Post-selection workflow gates. Creator confirmation happens after selection;
    # final verification is only available after all deliverables are approved.
    creator_confirmed = Column(Boolean, nullable=False, default=False)
    creator_verified = Column(Boolean, nullable=False, default=False)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    campaign = relationship("Campaign", back_populates="applications")
    creator = relationship("User", foreign_keys=[creator_id])

    # ============================================
    # COMPUTED (not columns) — read by ApplicationResponse
    # (schemas/application.py) via from_attributes, same pattern as
    # User.profile in models/user.py. Lets the applications inbox show
    # a name/avatar/campaign title without extra round-trips per row.
    # ============================================
    @property
    def creator_name(self):
        if self.creator and self.creator.role == "creator" and self.creator.profile:
            name = self.creator.profile.get("display_name")
            if name:
                return name
        return self.creator.full_name if self.creator else None

    @property
    def creator_avatar(self):
        if self.creator and self.creator.role == "creator" and self.creator.profile:
            return self.creator.profile.get("profile_image")
        return None

    @property
    def campaign_title(self):
        return self.campaign.title if self.campaign else None