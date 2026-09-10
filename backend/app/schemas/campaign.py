from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List
from datetime import datetime
from enum import Enum

# ===== ENUMS =====
class CampaignType(str, Enum):
    PAID = "paid"
    GIFTED = "gifted"

class CampaignStatus(str, Enum):
    DRAFT = "draft"
    PUBLISHED = "published"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    CANCELLED = "cancelled"
    CLOSED = "closed"

# ===== CHECKLIST ITEM =====
class ChecklistItem(BaseModel):
    text: str
    checked: bool = False

# ===== VIDEO SPECS =====
class VideoSpec(BaseModel):
    platform: str
    duration: Optional[str] = None
    aspect_ratio: Optional[str] = None
    resolution: Optional[str] = None
    frame_rate: Optional[str] = None
    file_type: Optional[str] = None
    voiceover_required: bool = False
    subtitles_required: bool = False

# ===== BASE SCHEMA =====
class CampaignBase(BaseModel):
    title: str = Field(..., min_length=3, max_length=255)
    tagline: Optional[str] = None
    description: str = Field(..., min_length=10)
    brief: Optional[str] = None
    category: str = Field(..., min_length=2)
    sub_category: Optional[str] = None
    campaign_type: CampaignType = CampaignType.GIFTED
    brand_name: Optional[str] = None
    brand_location: Optional[str] = None
    budget: Optional[float] = Field(None, gt=0)
    compensation_description: Optional[str] = None
    requirements: Optional[str] = None
    creator_requirements: Optional[dict] = None
    deliverables: Optional[List[str]] = None
    before_you_apply: Optional[List[str]] = None
    checklist: Optional[List[ChecklistItem]] = None
    required_scenes: Optional[List[str]] = None
    video_specs: Optional[List[VideoSpec]] = None
    dos: Optional[List[str]] = None
    donts: Optional[List[str]] = None
    suggested_caption: Optional[str] = None
    hashtags: Optional[List[str]] = None
    guidelines_note: Optional[str] = None
    deadline: Optional[datetime] = None
    application_deadline: Optional[datetime] = None
    deliverable_deadline: Optional[datetime] = None
    creators_needed: int = Field(1, ge=1, le=100)
    application_questions: Optional[List[str]] = None
    hero_image: Optional[str] = None
    extra_photos: Optional[List[str]] = None  # ← ADD THIS

    # Completion / publication requirements
    completion_mode: str = "approval_only"  # approval_only | publication_required
    required_platforms: Optional[List[str]] = None
    required_post_types: Optional[List[str]] = None
    publication_deadline: Optional[datetime] = None
    required_mentions: Optional[List[str]] = None

    # Deprecated single-value fields — still accepted so older clients don't break.
    required_platform: Optional[str] = None
    required_post_type: Optional[str] = None

# ===== CREATE =====
class CampaignCreate(CampaignBase):
    pass

# ===== UPDATE =====
class CampaignUpdate(BaseModel):
    title: Optional[str] = None
    tagline: Optional[str] = None
    description: Optional[str] = None
    brief: Optional[str] = None
    category: Optional[str] = None
    sub_category: Optional[str] = None
    campaign_type: Optional[CampaignType] = None
    brand_name: Optional[str] = None
    brand_location: Optional[str] = None
    budget: Optional[float] = None
    compensation_description: Optional[str] = None
    requirements: Optional[str] = None
    creator_requirements: Optional[dict] = None
    deliverables: Optional[List[str]] = None
    before_you_apply: Optional[List[str]] = None
    checklist: Optional[List[ChecklistItem]] = None
    required_scenes: Optional[List[str]] = None
    video_specs: Optional[List[VideoSpec]] = None
    dos: Optional[List[str]] = None
    donts: Optional[List[str]] = None
    suggested_caption: Optional[str] = None
    hashtags: Optional[List[str]] = None
    guidelines_note: Optional[str] = None
    deadline: Optional[datetime] = None
    application_deadline: Optional[datetime] = None
    deliverable_deadline: Optional[datetime] = None
    creators_needed: Optional[int] = Field(None, ge=1, le=100)
    application_questions: Optional[List[str]] = None
    status: Optional[CampaignStatus] = None
    hero_image: Optional[str] = None
    extra_photos: Optional[List[str]] = None  # ← ADD THIS
    is_active: Optional[bool] = None

    # Completion / publication requirements
    completion_mode: Optional[str] = None
    required_platforms: Optional[List[str]] = None
    required_post_types: Optional[List[str]] = None
    publication_deadline: Optional[datetime] = None
    required_mentions: Optional[List[str]] = None
    required_platform: Optional[str] = None  # deprecated
    required_post_type: Optional[str] = None  # deprecated

# ===== RESPONSE =====
class CampaignResponse(CampaignBase):
    id: int
    business_id: int
    status: CampaignStatus
    is_active: bool
    created_at: datetime
    updated_at: Optional[datetime] = None
    application_count: int = 0
    extra_photos: Optional[List[str]] = None  # ← ADD THIS
    
    model_config = ConfigDict(from_attributes=True)