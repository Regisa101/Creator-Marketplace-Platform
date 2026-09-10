from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class PaymentInitiateRequest(BaseModel):
    collab_id: int  # application id


class PaymentInitiateResponse(BaseModel):
    payment_url: str
    pidx: str
    purchase_order_id: str


class PaymentResponse(BaseModel):
    id: int
    application_id: int
    purchase_order_id: str
    pidx: Optional[str] = None
    transaction_id: Optional[str] = None
    amount: float
    currency: str
    status: str
    method: str
    paid_at: Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True
