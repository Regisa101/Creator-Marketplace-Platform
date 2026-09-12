from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime, DECIMAL, ForeignKey, JSON, Enum
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database import Base
import enum

class CampaignType(str, enum.Enum):
    PAID = "paid"

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
    # Content types can be a comma-separated list selected in the campaign form.
    # Keep this as TEXT so edits cannot fail when several content types are selected.
    sub_category = Column(Text, nullable=True)
    
    # Campaign Type
    campaign_type = Column(Enum(CampaignType), default=CampaignType.PAID)
    
    # Brand/Company
    brand_name = Column(String(255), nullable=True)
    brand_location = Column(String(255), nullable=True)
    
    # Budget & Compensation
    budget = Column(DECIMAL(10,2), nullable=True)
    compensation_description = Column(Text, nullable=True)
    
    # Requirements
    requirements = Column(Text, nullable=True)
    # Structured, optional creator filters used by the explainable matching engine.
    creator_requirements = Column(JSON, nullable=True)
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
    
    # Completion / publication requirements
    completion_mode = Column(String(30), nullable=False, default="approval_only")  # approval_only | publication_required
    required_platform = Column(String(50), nullable=True)  # deprecated: single-platform, kept for backward compat
    required_post_type = Column(String(50), nullable=True)  # deprecated: single-post-type, kept for backward compat
    required_platforms = Column(JSON, nullable=True)  # list[str], e.g. ["instagram", "tiktok"]
    required_post_types = Column(JSON, nullable=True)  # list[str], e.g. ["reel", "story"]
    publication_deadline = Column(DateTime(timezone=True), nullable=True)
    required_mentions = Column(JSON, nullable=True)

    # Timeline
    # `deadline` is kept as a backward-compatible alias for the application deadline.
    deadline = Column(DateTime(timezone=True), nullable=True)
    application_deadline = Column(DateTime(timezone=True), nullable=True)
    deliverable_deadline = Column(DateTime(timezone=True), nullable=True)

    # Creator selection / application flow
    creators_needed = Column(Integer, nullable=False, default=1)
    application_questions = Column(JSON, nullable=True)
    
    # Funding (paid campaigns are not open for applications until funded)
    funding_status = Column(String(30), nullable=False, default="unfunded")
    funded_amount = Column(DECIMAL(10,2), nullable=True)
    funded_at = Column(DateTime(timezone=True), nullable=True)

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