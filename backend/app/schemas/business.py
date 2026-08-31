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