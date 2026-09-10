from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, DECIMAL
from sqlalchemy.sql import func
from app.database import Base


class CampaignPerformance(Base):
    __tablename__ = "campaign_performances"

    id = Column(Integer, primary_key=True, index=True)
    campaign_id = Column(Integer, ForeignKey("campaigns.id", ondelete="CASCADE"), nullable=False, unique=True, index=True)
    revenue = Column(DECIMAL(12, 2), nullable=False, default=0)
    other_costs = Column(DECIMAL(12, 2), nullable=False, default=0)
    sales_count = Column(Integer, nullable=True)
    reach = Column(Integer, nullable=True)
    engagement = Column(Integer, nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    campaign = None
