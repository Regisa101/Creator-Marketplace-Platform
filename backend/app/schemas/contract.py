from datetime import datetime
from typing import Literal, Optional
from pydantic import BaseModel, Field


class ContractFinalizeRequest(BaseModel):
    agreed_rate: float = Field(gt=0)
    total_value: Optional[float] = Field(default=None, gt=0)
    terms_note: Optional[str] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None


class ContractPayFeeRequest(BaseModel):
    """
    DEMO PAYMENT ONLY. Filled in by the fake Wallet/Card form on the
    frontend — no real gateway (Khalti, eSewa, a card processor, etc.) is
    ever contacted with these values. This is separate from the app's real
    Khalti `Payment` flow (see app/schemas/payment.py / routes/payments.py)
    used elsewhere.
    """
    payment_method: Literal["wallet", "card"]
    wallet_number: Optional[str] = None
    wallet_pin: Optional[str] = None
    card_number: Optional[str] = None
    card_expiry: Optional[str] = None
    card_cvv: Optional[str] = None
    card_holder: Optional[str] = None


class ContractResponse(BaseModel):
    id: int
    campaign_id: int
    application_id: int
    business_id: int
    creator_id: int
    engagement_type: Optional[str] = None
    duration: Optional[str] = None
    pricing_model: Optional[str] = None
    compensation_type: Optional[str] = None
    compensation_description: Optional[str] = None
    agreed_rate: Optional[float] = None
    total_value: Optional[float] = None
    platform_fee_rate: float
    platform_fee_amount: Optional[float] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    status: str
    terms_note: Optional[str] = None
    payment_method: Optional[str] = None
    payment_reference: Optional[str] = None
    fee_paid: bool = False
    fee_paid_at: Optional[datetime] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    campaign_title: Optional[str] = None
    creator_name: Optional[str] = None
    business_name: Optional[str] = None

    class Config:
        from_attributes = True


class ContractSummary(BaseModel):
    role: str
    this_month: float
    lifetime: float
    active_contracts: int