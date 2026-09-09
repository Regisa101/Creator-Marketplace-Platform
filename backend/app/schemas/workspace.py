from pydantic import BaseModel
from typing import Optional
from datetime import datetime


# ============================================
# COLLABORATION (an accepted Application, viewed from Workspace)
# ============================================

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
    rate: Optional[float] = None
    status: str
    created_at: datetime

    pending_deliverables: int = 0
    unread_messages: int = 0

    class Config:
        from_attributes = True


# ============================================
# MESSAGES
# ============================================

class MessageCreate(BaseModel):
    collab_id: int
    body: str


class MessageResponse(BaseModel):
    id: int
    application_id: int
    sender_id: int
    sender_name: Optional[str] = None
    sender_role: Optional[str] = None
    body: str
    created_at: datetime

    class Config:
        from_attributes = True


# ============================================
# CALENDAR
# ============================================

class CalendarEventCreate(BaseModel):
    collab_id: int
    title: str
    description: Optional[str] = None
    event_date: datetime
    event_type: Optional[str] = "milestone"


class CalendarEventResponse(BaseModel):
    id: int
    application_id: int
    campaign_title: Optional[str] = None
    other_party_name: Optional[str] = None
    title: str
    description: Optional[str] = None
    event_date: datetime
    event_type: str
    created_by: int
    created_at: datetime

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
    submission_note: Optional[str] = None


class DeliverableReview(BaseModel):
    status: str  # approved, revision_requested
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
    submission_note: Optional[str] = None
    feedback: Optional[str] = None
    submitted_at: Optional[datetime] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True
