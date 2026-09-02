from pydantic import BaseModel
from datetime import datetime


class SavedCampaignCreate(BaseModel):
    campaign_id: int


class SavedCampaignResponse(BaseModel):
    id: int
    creator_id: int
    campaign_id: int
    created_at: datetime

    class Config:
        from_attributes = True