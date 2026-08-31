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
    tagline = Column(String(255), nullable=True)  # "Bring Paper Back to Life"
    description = Column(Text, nullable=False)
    brief = Column(Text, nullable=True)
    category = Column(String(100), nullable=False)
    sub_category = Column(String(100), nullable=True)  # "Product Lifestyle"
    
    # Campaign Type
    campaign_type = Column(Enum(CampaignType), default=CampaignType.GIFTED)  # paid, gifted
    
    # Brand/Company
    brand_name = Column(String(255), nullable=True)  # "PaperMadePaper"
    brand_location = Column(String(255), nullable=True)  # "Kathmandu Valley, Nepal"
    
    # Budget & Compensation
    budget = Column(DECIMAL(10,2), nullable=True)
    compensation_description = Column(Text, nullable=True)  # "Free handmade paper products"
    
    # Requirements
    requirements = Column(Text, nullable=True)  # "Creators should have clean, aesthetic..."
    deliverables = Column(JSON, nullable=True)  # ["Instagram Reel", "Instagram Story"]
    
    # Checklist
    checklist = Column(JSON, nullable=True)  # [{"text": "...", "checked": true}]
    
    # Required Scenes
    required_scenes = Column(JSON, nullable=True)  # ["Product Introduction", "Handmade Details", ...]
    
    # Video Specs
    video_specs = Column(JSON, nullable=True)  # {"platform": "TikTok", "duration": "15-30s", "ratio": "9:16"}
    
    # Do's & Don'ts
    dos = Column(JSON, nullable=True)  # ["Show how product can be used", ...]
    donts = Column(JSON, nullable=True)  # ["Make it salesy", ...]
    
    # Caption & Tags
    suggested_caption = Column(Text, nullable=True)
    hashtags = Column(JSON, nullable=True)  # ["#handmadepaper", "#nepalcreators"]
    
    # Timeline
    deadline = Column(DateTime(timezone=True), nullable=True)
    
    # Status
    status = Column(Enum(CampaignStatus), default=CampaignStatus.DRAFT)
    is_active = Column(Boolean, default=True)
    
    # Hero Image
    hero_image = Column(String(255), nullable=True)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    business = relationship("User", foreign_keys=[business_id])
    applications = relationship("Application", back_populates="campaign", cascade="all, delete-orphan")