from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field


class GiftFulfillmentUpdate(BaseModel):
    method: Optional[str] = Field(default=None)  # pickup | shipping
    recipient_name: Optional[str] = None
    shipping_address: Optional[str] = None
    phone: Optional[str] = None
    pickup_location: Optional[str] = None
    pickup_available_from: Optional[datetime] = None
    courier: Optional[str] = None
    tracking_number: Optional[str] = None
    notes: Optional[str] = None
    status: Optional[str] = None


class GiftFulfillmentResponse(BaseModel):
    id: int
    application_id: int
    method: Optional[str] = None
    status: str
    recipient_name: Optional[str] = None
    shipping_address: Optional[str] = None
    phone: Optional[str] = None
    pickup_location: Optional[str] = None
    pickup_available_from: Optional[datetime] = None
    pickup_code: Optional[str] = None
    courier: Optional[str] = None
    tracking_number: Optional[str] = None
    notes: Optional[str] = None
    received_at: Optional[datetime] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True
