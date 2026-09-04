from pydantic import BaseModel
from datetime import datetime
from app.schemas.campaign import CampaignResponse


class SavedCampaignCreate(BaseModel):
    campaign_id: int


class SavedCampaignResponse(BaseModel):
    id: int
    creator_id: int
    campaign_id: int
    created_at: datetime
    # Nested via the `campaign` relationship already defined on the
    # SavedCampaign model — Pydantic resolves it automatically through
    # from_attributes, so a saved-campaigns list page can render full
    # cards without a separate GET per bookmark.
    campaign: CampaignResponse

    class Config:
        from_attributes = True