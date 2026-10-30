from datetime import datetime
from typing import Any, Optional
from pydantic import BaseModel, Field


class ApplicationBase(BaseModel):
    campaign_id: int
    proposal: Optional[str] = None
    rate: Optional[float] = None
    message: Optional[str] = None
    application_answers: Optional[list[dict[str, Any]]] = None
    selected_portfolio: Optional[list[Any]] = None
    social_link: Optional[str] = None


class ApplicationCreate(ApplicationBase):
    pass


class ApplicationUpdate(BaseModel):
    status: Optional[str] = None


class ApplicationResponse(ApplicationBase):
    id: int
    creator_id: int
    creator_name: Optional[str] = None
    creator_avatar: Optional[str] = None
    campaign_title: Optional[str] = None
    campaign_budget: Optional[float] = None
    creators_needed: Optional[int] = None
    # "fixed" or "negotiable" (from the campaign).
    price_type: Optional[str] = None
    # Negotiation summary for the brand's Applications screen (None if no chat yet).
    negotiation: Optional[dict[str, Any]] = None
    agreed_rate: Optional[float] = None
    rate_locked: bool = False
    status: str
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class ApplicationSelectResponse(BaseModel):
    application_id: int
    payment_url: str
    pidx: str
    purchase_order_id: str
    amount: float


# ============================================
# CREATOR APPLICATION TRACKER
# ============================================
class TrackerApplication(BaseModel):
    id: int
    campaign_id: int
    campaign_title: Optional[str] = None
    campaign_category: Optional[str] = None
    brand_name: Optional[str] = None
    brand_logo: Optional[str] = None
    # Platforms the brand requires (empty when the campaign does not specify any).
    platforms: list[str] = Field(default_factory=list)
    # Platform of the profile link the creator applied with (instagram / tiktok / facebook).
    applied_platform: Optional[str] = None
    compensation: Optional[str] = None
    raw_status: str
    # Normalised bucket: under_review | accepted | rejected | withdrawn
    status_group: str
    can_withdraw: bool = False
    contract_id: Optional[int] = None
    created_at: datetime
    updated_at: Optional[datetime] = None


class TrackerSummary(BaseModel):
    total: int = 0
    under_review: int = 0
    accepted: int = 0
    rejected: int = 0
    withdrawn: int = 0


class TrackerResponse(BaseModel):
    summary: TrackerSummary
    applications: list[TrackerApplication]