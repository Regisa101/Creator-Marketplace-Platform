from datetime import datetime
from enum import Enum
from typing import List, Optional

from pydantic import BaseModel, ConfigDict, Field


# ============================================================
# ENUMS
# ============================================================

class CampaignType(str, Enum):
    PAID = "paid"


class CampaignStatus(str, Enum):
    DRAFT = "draft"
    PUBLISHED = "published"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    CANCELLED = "cancelled"
    CLOSED = "closed"


# ============================================================
# BASE
# ============================================================

class CampaignBase(BaseModel):
    title: str = Field(
        ...,
        min_length=3,
        max_length=255,
    )

    category: str = Field(
        ...,
        min_length=2,
        max_length=100,
    )

    description: str = Field(
        ...,
        min_length=10,
    )

    responsibilities: Optional[str] = None

    # ------------------------------------------------------------
    # Creator requirements
    # ------------------------------------------------------------

    creator_types: Optional[List[str]] = None

    experience_level: Optional[str] = None

    required_skills: Optional[List[str]] = None

    location: Optional[str] = None

    work_arrangement: Optional[str] = None

    requirements: Optional[str] = None

    # ------------------------------------------------------------
    # Deliverables
    # ------------------------------------------------------------

    deliverables: Optional[List[str]] = None

    # ------------------------------------------------------------
    # Creator count
    # ------------------------------------------------------------

    creators_needed: int = Field(
        default=1,
        ge=1,
        le=100,
    )

    # ------------------------------------------------------------
    # Engagement
    # ------------------------------------------------------------

    engagement_type: Optional[str] = None

    duration: Optional[str] = None

    # ------------------------------------------------------------
    # Compensation
    # ------------------------------------------------------------

    pricing_model: Optional[str] = None

    compensation_type: Optional[str] = None

    budget: Optional[float] = Field(
        default=None,
        gt=0,
    )

    budget_min: Optional[float] = Field(
        default=None,
        gt=0,
    )

    budget_max: Optional[float] = Field(
        default=None,
        gt=0,
    )

    compensation_description: Optional[str] = None

    # ------------------------------------------------------------
    # Timeline
    # ------------------------------------------------------------

    start_date: Optional[datetime] = None

    end_date: Optional[datetime] = None

    application_deadline: Optional[datetime] = None

    # ------------------------------------------------------------
    # Screening
    # ------------------------------------------------------------

    application_questions: Optional[List[str]] = None

    # ------------------------------------------------------------
    # Image
    # ------------------------------------------------------------

    hero_image: Optional[str] = None


# ============================================================
# CREATE
# ============================================================

class CampaignCreate(CampaignBase):
    pass


# ============================================================
# UPDATE
# ============================================================

class CampaignUpdate(BaseModel):
    title: Optional[str] = Field(
        default=None,
        min_length=3,
        max_length=255,
    )

    category: Optional[str] = None

    description: Optional[str] = None

    responsibilities: Optional[str] = None

    creator_types: Optional[List[str]] = None

    experience_level: Optional[str] = None

    required_skills: Optional[List[str]] = None

    location: Optional[str] = None

    work_arrangement: Optional[str] = None

    requirements: Optional[str] = None

    deliverables: Optional[List[str]] = None

    creators_needed: Optional[int] = Field(
        default=None,
        ge=1,
        le=100,
    )

    engagement_type: Optional[str] = None

    duration: Optional[str] = None

    pricing_model: Optional[str] = None

    compensation_type: Optional[str] = None

    budget: Optional[float] = Field(
        default=None,
        gt=0,
    )

    budget_min: Optional[float] = Field(
        default=None,
        gt=0,
    )

    budget_max: Optional[float] = Field(
        default=None,
        gt=0,
    )

    compensation_description: Optional[str] = None

    start_date: Optional[datetime] = None

    end_date: Optional[datetime] = None

    application_deadline: Optional[datetime] = None

    application_questions: Optional[List[str]] = None

    hero_image: Optional[str] = None

    status: Optional[CampaignStatus] = None

    is_active: Optional[bool] = None


# ============================================================
# RESPONSE
# ============================================================

class CampaignResponse(CampaignBase):
    id: int

    business_id: int

    status: CampaignStatus

    is_active: bool

    created_at: datetime

    updated_at: Optional[datetime] = None

    application_count: int = 0

    model_config = ConfigDict(
        from_attributes=True,
    )