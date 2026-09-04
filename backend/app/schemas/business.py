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
# Same fields as BusinessOnboardingComplete, but company_name is also
# optional here — a step-1 "Continue" click might save it, but a
# step-1 field-by-field autosave (if ever added) shouldn't require it
# either. The route only touches whatever fields are actually present
# in the request (`exclude_unset=True`), same pattern as
# CreatorOnboardingProgress.
#
# default_dos / default_donts / default_video_spec are also saved
# through this same endpoint (PATCH /onboarding/business/progress) —
# Campaignform.tsx's "Manage my campaign defaults" panel calls
# saveBusinessProgress() with just these three fields, so no separate
# defaults endpoint was needed.

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