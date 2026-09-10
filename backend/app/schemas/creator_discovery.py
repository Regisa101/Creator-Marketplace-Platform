from pydantic import BaseModel
from typing import Optional, List, Any
from datetime import datetime


# ============================================
# LIST / CARD VIEW (Discover Creators grid)
# ============================================

class CreatorListItem(BaseModel):
    id: int  # this is the creator's user_id
    display_name: Optional[str] = None
    username: Optional[str] = None
    bio: Optional[str] = None
    location: Optional[str] = None
    profile_image: Optional[str] = None
    creator_type: Optional[str] = None
    categories: List[str] = []
    content_types: List[str] = []
    starting_price: Optional[float] = None
    is_shortlisted: bool = False
    avg_rating: Optional[float] = None
    ratings_count: int = 0

    class Config:
        from_attributes = True


class CreatorListResponse(BaseModel):
    creators: List[CreatorListItem]
    total: int
    page: int
    limit: int
    pages: int


# ============================================
# PUBLIC PROFILE (full detail view)
# ============================================

class CreatorWorkHistoryItem(BaseModel):
    campaign_id: int
    campaign_title: str
    business_name: Optional[str] = None
    completed_at: Optional[datetime] = None
    deliverables: List[str] = []


class PublicCreatorProfile(BaseModel):
    id: int
    display_name: Optional[str] = None
    username: Optional[str] = None
    bio: Optional[str] = None
    location: Optional[str] = None
    profile_image: Optional[str] = None
    creator_type: Optional[str] = None
    categories: List[str] = []
    content_types: List[str] = []
    languages: List[str] = []
    audience_age_range: List[str] = []
    audience_location: List[str] = []
    interests: List[str] = []
    starting_price: Optional[float] = None
    portfolio: List[Any] = []
    socials: List[Any] = []
    is_shortlisted: bool = False
    avg_rating: Optional[float] = None
    ratings_count: int = 0
    work_history: List[CreatorWorkHistoryItem] = []


# ============================================
# SHORTLIST
# ============================================

class ShortlistEntry(BaseModel):
    id: int
    creator_id: int
    created_at: datetime
    creator: CreatorListItem

    class Config:
        from_attributes = True


# ============================================
# INVITES
# ============================================

class CreatorInviteCreate(BaseModel):
    campaign_id: Optional[int] = None
    message: Optional[str] = None


class CreatorInviteUpdate(BaseModel):
    status: str  # accepted, declined


class CreatorInviteResponse(BaseModel):
    id: int
    business_id: int
    creator_id: int
    campaign_id: Optional[int] = None
    message: Optional[str] = None
    status: str
    created_at: datetime
    updated_at: Optional[datetime] = None

    business_name: Optional[str] = None
    creator_name: Optional[str] = None
    campaign_title: Optional[str] = None

    class Config:
        from_attributes = True
