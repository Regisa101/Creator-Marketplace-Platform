from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime, DECIMAL, ForeignKey, JSON, Enum
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database import Base
import enum

class CampaignType(str, enum.Enum):
    PAID = "paid"
    GIFTED = "gifted"

class CampaignStatus(str, enum.Enum):
    DRAFT = "draft"
    PUBLISHED = "published"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    CANCELLED = "cancelled"
    CLOSED = "closed"

class Campaign(Base):
    __tablename__ = "campaigns"
    
    id = Column(Integer, primary_key=True, index=True)
    business_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    # Basic Info
    title = Column(String(255), nullable=False)
    tagline = Column(String(255), nullable=True)
    description = Column(Text, nullable=False)
    brief = Column(Text, nullable=True)
    category = Column(String(100), nullable=False)
    sub_category = Column(String(100), nullable=True)
    
    # Campaign Type
    campaign_type = Column(Enum(CampaignType), default=CampaignType.GIFTED)
    
    # Brand/Company
    brand_name = Column(String(255), nullable=True)
    brand_location = Column(String(255), nullable=True)
    
    # Budget & Compensation
    budget = Column(DECIMAL(10,2), nullable=True)
    compensation_description = Column(Text, nullable=True)
    
    # Requirements
    requirements = Column(Text, nullable=True)
    deliverables = Column(JSON, nullable=True)
    before_you_apply = Column(JSON, nullable=True)  # ← ADD THIS
    
    # Checklist
    checklist = Column(JSON, nullable=True)
    
    # Required Scenes
    required_scenes = Column(JSON, nullable=True)
    
    # Video Specs
    video_specs = Column(JSON, nullable=True)
    
    # Do's & Don'ts
    dos = Column(JSON, nullable=True)
    donts = Column(JSON, nullable=True)
    
    # Caption & Tags
    suggested_caption = Column(Text, nullable=True)
    hashtags = Column(JSON, nullable=True)
    guidelines_note = Column(Text, nullable=True)  # ← ADD THIS
    
    # Images
    hero_image = Column(String(255), nullable=True)
    extra_photos = Column(JSON, nullable=True)  # ← ADD THIS (MOST IMPORTANT)
    
    # Timeline
    deadline = Column(DateTime(timezone=True), nullable=True)
    
    # Status
    status = Column(Enum(CampaignStatus), default=CampaignStatus.DRAFT)
    is_active = Column(Boolean, default=True)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    business = relationship("User", foreign_keys=[business_id])
    applications = relationship("Application", back_populates="campaign", cascade="all, delete-orphan")
    saved_by = relationship("SavedCampaign", back_populates="campaign", cascade="all, delete-orphan")