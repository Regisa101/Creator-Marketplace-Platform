from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field, ConfigDict


class CampaignPerformanceUpdate(BaseModel):
    revenue: float = Field(0, ge=0)
    other_costs: float = Field(0, ge=0)
    sales_count: Optional[int] = Field(None, ge=0)
    reach: Optional[int] = Field(None, ge=0)
    engagement: Optional[int] = Field(None, ge=0)
    notes: Optional[str] = None


class CampaignPerformanceResponse(BaseModel):
    id: Optional[int] = None
    campaign_id: int
    campaign_title: Optional[str] = None
    creator_spend: float = 0
    revenue: float = 0
    other_costs: float = 0
    total_cost: float = 0
    estimated_profit: float = 0
    roi_percent: float = 0
    sales_count: Optional[int] = None
    reach: Optional[int] = None
    engagement: Optional[int] = None
    notes: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    model_config = ConfigDict(from_attributes=True)
