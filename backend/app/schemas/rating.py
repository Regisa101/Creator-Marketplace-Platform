from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


class RatingCreate(BaseModel):
    collab_id: int
    score: int = Field(ge=1, le=5)
    review: Optional[str] = None


class RatingResponse(BaseModel):
    id: int
    application_id: int
    business_id: int
    creator_id: int
    business_name: Optional[str] = None
    campaign_title: Optional[str] = None
    score: int
    review: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class CreatorRatingSummary(BaseModel):
    average: Optional[float] = None
    count: int = 0
    ratings: list[RatingResponse] = []
