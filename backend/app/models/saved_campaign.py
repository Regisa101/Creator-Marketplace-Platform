from sqlalchemy import Column, Integer, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database import Base


class SavedCampaign(Base):
    """A creator bookmarking a campaign — the 'Save Campaign' button on
    the campaign detail page. Deliberately a thin join table (no status,
    no notes) since that's all the UI currently needs; extend later if
    e.g. saved-with-a-note becomes a real feature.
    """
    __tablename__ = "saved_campaigns"

    id = Column(Integer, primary_key=True, index=True)
    creator_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    campaign_id = Column(Integer, ForeignKey("campaigns.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    creator = relationship("User", foreign_keys=[creator_id])
    campaign = relationship("Campaign")

    __table_args__ = (
        # One save per creator per campaign — the route also checks
        # this before inserting, but the constraint is the real
        # guarantee if two requests race.
        UniqueConstraint("creator_id", "campaign_id", name="uq_saved_campaign_creator_campaign"),
    )