from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from typing import List, Any

class ApplicationBase(BaseModel):
    campaign_id: int
    proposal: str
    rate: Optional[float] = None
    message: Optional[str] = None
    application_answers: Optional[List[dict]] = None
    selected_portfolio: Optional[List[Any]] = None

class ApplicationCreate(ApplicationBase):
    pass

class ApplicationUpdate(BaseModel):
    status: Optional[str] = None  # accepted, rejected
    deliverable_deadline: Optional[datetime] = None

class ApplicationResponse(ApplicationBase):
    id: int
    creator_id: int
    application_answers: Optional[List[dict]] = None
    selected_portfolio: Optional[List[Any]] = None
    deliverable_deadline: Optional[datetime] = None
    # Computed properties on the Application model (see
    # models/application.py) — pulled from the applicant's User/
    # CreatorProfile and the parent Campaign so an inbox list doesn't
    # need N follow-up requests just to show who applied and to what.
    creator_name: Optional[str] = None
    creator_avatar: Optional[str] = None
    campaign_title: Optional[str] = None
    match_score: Optional[int] = None
    match_breakdown: Optional[List[dict]] = None
    match_reasons: Optional[List[str]] = None
    match_configured_count: int = 0
    status: str
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True