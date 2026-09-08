from pydantic import BaseModel, Field
from typing import Optional, List


class BusinessOnboardingComplete(BaseModel):
    # ===== BASIC INFO =====
    company_name: str = Field(..., min_length=1)
    business_type: Optional[str] = None
    industry: Optional[str] = None
    location: Optional[str] = None

    # ===== BUSINESS INFO =====
    website: Optional[str] = None
    description: Optional[str] = None
    logo_url: Optional[str] = None
    contact_phone: Optional[str] = None

    # ===== PREFERENCES =====
    interested_categories: Optional[List[str]] = None
    preferred_content_types: Optional[List[str]] = None
    typical_budget: Optional[float] = None

    # ===== TEAM =====
    team_size: Optional[str] = None
    year_established: Optional[int] = None


# ============================================
# PARTIAL PROGRESS (resume-where-you-left-off)
# ============================================

class VideoSpecDict(BaseModel):
    platform: str = "General"
    duration: Optional[str] = None
    aspect_ratio: Optional[str] = None
    voiceover_required: bool = False
    subtitles_required: bool = False


class BusinessOnboardingProgress(BaseModel):
    company_name: Optional[str] = None
    business_type: Optional[str] = None
    industry: Optional[str] = None
    location: Optional[str] = None

    website: Optional[str] = None
    description: Optional[str] = None
    logo_url: Optional[str] = None
    contact_phone: Optional[str] = None

    interested_categories: Optional[List[str]] = None
    preferred_content_types: Optional[List[str]] = None
    typical_budget: Optional[float] = None

    team_size: Optional[str] = None
    year_established: Optional[int] = None

    default_dos: Optional[List[str]] = None
    default_donts: Optional[List[str]] = None
    default_video_spec: Optional[VideoSpecDict] = None


# ============================================
# PUBLIC BUSINESS PROFILE
# ============================================
# Deliberately excludes private fields such as contact_phone,
# typical_budget, and campaign-default settings.

class PublicCampaignSummary(BaseModel):
    id: int
    title: str
    category: str
    sub_category: Optional[str] = None
    campaign_type: str
    status: str


class PublicBusinessProfile(BaseModel):
    id: int
    company_name: str
    business_type: Optional[str] = None
    industry: Optional[str] = None
    location: Optional[str] = None
    website: Optional[str] = None
    description: Optional[str] = None
    logo_url: Optional[str] = None

    interested_categories: List[str] = []
    preferred_content_types: List[str] = []

    team_size: Optional[str] = None
    year_established: Optional[int] = None

    is_onboarding_complete: bool
    is_published: bool

    campaigns: List[PublicCampaignSummary] = []
