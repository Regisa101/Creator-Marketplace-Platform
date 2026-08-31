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
    status: str
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True