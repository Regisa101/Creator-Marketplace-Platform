from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field
class PublicationProofCreate(BaseModel):
    deliverable_id: Optional[int] = None
    platform: str = Field(min_length=2, max_length=50)
    post_type: Optional[str] = None
    post_url: str = Field(min_length=8, max_length=1000)
    screenshot_url: Optional[str] = None
class PublicationProofReview(BaseModel):
    status: str
    feedback: Optional[str] = None
class PublicationProofResponse(BaseModel):
    id: int
    application_id: int
    deliverable_id: Optional[int] = None
    platform: str
    post_type: Optional[str] = None
    post_url: str
    screenshot_url: Optional[str] = None
    status: str
    feedback: Optional[str] = None
    submitted_at: Optional[datetime] = None
    verified_at: Optional[datetime] = None
    verified_by: Optional[int] = None
    class Config:
        from_attributes = True
