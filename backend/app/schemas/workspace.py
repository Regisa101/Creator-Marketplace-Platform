from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, Field


# ============================================
# COLLABORATION
# An accepted Application viewed from Workspace
# ============================================

class CollabRateFix(BaseModel):
    """Used to repair a collaboration that was accepted without ever
    getting an agreed rate locked in (e.g. legacy data, or a campaign
    whose type changed after acceptance). Only usable while the
    collaboration has no agreed rate yet — see the route for the guard."""
    amount: float = Field(..., gt=0)


class CollabResponse(BaseModel):
    id: int  # application id

    campaign_id: int
    campaign_title: Optional[str] = None

    business_id: int
    business_name: Optional[str] = None
    business_logo: Optional[str] = None

    creator_id: int
    creator_name: Optional[str] = None
    creator_avatar: Optional[str] = None

    # Pricing
    rate: Optional[float] = None
    agreed_rate: Optional[float] = None
    rate_locked: bool = False
    negotiation_status: str = "not_started"

    # Application / collaboration status
    status: str
    created_at: datetime

    creator_confirmed: bool = False
    creator_verified: bool = False

    # Deliverable summary
    pending_deliverables: int = 0
    total_deliverables: int = 0
    submitted_deliverables: int = 0
    approved_deliverables: int = 0

    # Payment summary
    # Latest payment attempt/status for this collaboration.
    payment_status: Optional[str] = None
    funded_amount: Optional[float] = None
    amount_paid: Optional[float] = None

    # Rating
    rated: bool = False

    # Campaign information
    campaign_type: Optional[str] = None
    completion_mode: Optional[str] = None

    # --------------------------------------------------
    # MULTI-PLATFORM CAMPAIGN REQUIREMENTS
    # --------------------------------------------------

    # Example:
    # ["instagram", "tiktok", "youtube"]
    required_platforms: Optional[List[str]] = None

    # Example:
    # ["reel", "short", "story"]
    required_post_types: Optional[List[str]] = None

    # --------------------------------------------------
    # Deprecated single-platform fields
    # Keep temporarily only if old frontend/backend code
    # still references them.
    # --------------------------------------------------

    required_platform: Optional[str] = None
    required_post_type: Optional[str] = None

    # Deadlines
    publication_deadline: Optional[datetime] = None
    deliverable_deadline: Optional[datetime] = None

    class Config:
        from_attributes = True


# ============================================
# DELIVERABLES
# ============================================

class DeliverableCreate(BaseModel):
    collab_id: int
    title: str
    description: Optional[str] = None
    due_date: Optional[datetime] = None


class DeliverableSubmit(BaseModel):
    file_url: str
    media_type: str  # image | video
    submission_note: Optional[str] = None


class DeliverableReview(BaseModel):
    status: str  # approved | revision_requested
    feedback: Optional[str] = None


class DeliverableResponse(BaseModel):
    id: int

    application_id: int

    campaign_title: Optional[str] = None
    other_party_name: Optional[str] = None

    title: str
    description: Optional[str] = None

    due_date: Optional[datetime] = None

    status: str

    file_url: Optional[str] = None
    media_type: Optional[str] = None

    submission_note: Optional[str] = None
    feedback: Optional[str] = None

    submitted_at: Optional[datetime] = None

    created_at: datetime
    updated_at: Optional[datetime] = None

    payment_released: bool = False
    payment_amount: Optional[float] = None
    payment_id: Optional[int] = None

    class Config:
        from_attributes = True