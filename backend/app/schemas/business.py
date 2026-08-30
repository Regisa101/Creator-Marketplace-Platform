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