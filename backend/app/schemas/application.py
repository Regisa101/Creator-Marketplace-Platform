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
