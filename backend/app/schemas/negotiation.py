from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field


class NegotiationOfferCreate(BaseModel):
    amount: float = Field(gt=0)
    message: Optional[str] = None


class NegotiationOfferResponse(BaseModel):
    id: int
    application_id: int
    sender_id: int
    sender_name: Optional[str] = None
    sender_role: Optional[str] = None
    amount: float
    message: Optional[str] = None
    status: str
    created_at: datetime
    responded_at: Optional[datetime] = None

    class Config:
        from_attributes = True
