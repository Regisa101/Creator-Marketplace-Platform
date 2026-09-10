from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class PaymentInitiateRequest(BaseModel):
    collab_id: int  # application id
    # Optional override — lets the brand pay a different amount than the
    # rate on file (e.g. a bonus, or filling in a rate that was never set
    # because the collab started as "gifted"). Falls back to
    # Application.rate on the backend when omitted.
    amount: Optional[float] = None


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
