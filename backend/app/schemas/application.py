from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class ApplicationBase(BaseModel):
    campaign_id: int
    proposal: str
    rate: Optional[float] = None
    message: Optional[str] = None

class ApplicationCreate(ApplicationBase):
    pass

class ApplicationUpdate(BaseModel):
    status: str  # accepted, rejected

class ApplicationResponse(ApplicationBase):
    id: int
    creator_id: int
    # Computed properties on the Application model (see
    # models/application.py) — pulled from the applicant's User/
    # CreatorProfile and the parent Campaign so an inbox list doesn't
    # need N follow-up requests just to show who applied and to what.
    creator_name: Optional[str] = None
    creator_avatar: Optional[str] = None
    campaign_title: Optional[str] = None
    status: str
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True