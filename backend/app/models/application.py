from sqlalchemy import Column, Integer, String, Text, DateTime, DECIMAL, ForeignKey
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
    message = Column(Text, nullable=True)
    
    # Status: pending, accepted, rejected, withdrawn
    status = Column(String(50), default="pending")
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    campaign = relationship("Campaign", back_populates="applications")
    creator = relationship("User", foreign_keys=[creator_id])