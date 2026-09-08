from pydantic import BaseModel, Field
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

# ===== NESTED SHAPES =====
class ChecklistItem(BaseModel):
    """One row in the 'Quick Checklist' grid, e.g. 'Format: 15 sec or longer, 9:16'."""
    text: str
    checked: bool = True

class VideoSpec(BaseModel):
    """One platform tab under 'Video Specs' (e.g. TikTok, Instagram Reel)."""
    platform: str
    duration: Optional[str] = None        # "15-30 seconds"
    aspect_ratio: Optional[str] = None     # "9:16"
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
    deliverables: Optional[List[str]] = None
    checklist: Optional[List[ChecklistItem]] = None
    required_scenes: Optional[List[str]] = None
    video_specs: Optional[List[VideoSpec]] = None
    dos: Optional[List[str]] = None
    donts: Optional[List[str]] = None
    suggested_caption: Optional[str] = None
    hashtags: Optional[List[str]] = None
    deadline: Optional[datetime] = None 
    hero_image: Optional[str] = None
    extra_photos: Optional[List[str]] = None

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
    deliverables: Optional[List[str]] = None
    checklist: Optional[List[ChecklistItem]] = None
    required_scenes: Optional[List[str]] = None
    video_specs: Optional[List[VideoSpec]] = None
    dos: Optional[List[str]] = None
    donts: Optional[List[str]] = None
    suggested_caption: Optional[str] = None
    hashtags: Optional[List[str]] = None
    deadline: Optional[datetime] = None
    status: Optional[CampaignStatus] = None
    hero_image: Optional[str] = None
    extra_photos: Optional[List[str]] = None
    is_active: Optional[bool] = None

# ===== RESPONSE =====
class CampaignResponse(CampaignBase):
    id: int
    business_id: int
    status: CampaignStatus
    is_active: bool
    created_at: datetime
    updated_at: Optional[datetime] = None
    application_count: int = 0  # ← Changed from Optional[int] to int with default
    
    model_config = {
        "from_attributes": True
    }