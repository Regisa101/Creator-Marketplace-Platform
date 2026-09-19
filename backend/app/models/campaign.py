from __future__ import annotations

import enum

from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    DECIMAL,
    Enum,
    ForeignKey,
    Integer,
    JSON,
    String,
    Text,
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.database import Base


class CampaignType(str, enum.Enum):
    PAID = "paid"


class CampaignStatus(str, enum.Enum):
    DRAFT = "draft"
    PUBLISHED = "published"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    CANCELLED = "cancelled"
    CLOSED = "closed"


class Campaign(Base):
    __tablename__ = "campaigns"

    id = Column(Integer, primary_key=True, index=True)

    business_id = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=False,
        index=True,
    )

    # ============================================================
    # BASIC INFORMATION
    # ============================================================

    title = Column(
        String(255),
        nullable=False,
    )

    category = Column(
        String(100),
        nullable=False,
    )

    description = Column(
        Text,
        nullable=False,
    )

    # What the business expects the creator to do.
    responsibilities = Column(
        Text,
        nullable=True,
    )

    # ============================================================
    # CREATOR REQUIREMENTS
    # ============================================================

    # Example:
    # ["Model", "Lifestyle Creator"]
    creator_types = Column(
        JSON,
        nullable=True,
    )

    # Entry / Intermediate / Experienced
    experience_level = Column(
        String(50),
        nullable=True,
    )

    # Example:
    # ["Photography", "Instagram", "Fashion Modeling"]
    required_skills = Column(
        JSON,
        nullable=True,
    )

    # Preferred creator location.
    location = Column(
        String(255),
        nullable=True,
    )

    # On-site / Remote / Hybrid
    work_arrangement = Column(
        String(30),
        nullable=True,
    )

    # Additional requirements written by the business.
    requirements = Column(
        Text,
        nullable=True,
    )

    # ============================================================
    # DELIVERABLES
    # ============================================================

    # Example:
    # [
    #   "4 photoshoot sessions",
    #   "8 short-form videos",
    #   "12 stories"
    # ]
    deliverables = Column(
        JSON,
        nullable=True,
    )

    # ============================================================
    # CREATOR COUNT
    # ============================================================

    creators_needed = Column(
        Integer,
        nullable=False,
        default=1,
    )

    # ============================================================
    # ENGAGEMENT
    # ============================================================

    # one_time / short_term / long_term
    engagement_type = Column(
        String(30),
        nullable=True,
    )

    # Example:
    # "3 months"
    # "12 months"
    # "One-time project"
    duration = Column(
        String(100),
        nullable=True,
    )

    # ============================================================
    # COMPENSATION
    # ============================================================

    # fixed / hourly / monthly
    pricing_model = Column(
        String(30),
        nullable=True,
    )

    # fixed / range / negotiable
    compensation_type = Column(
        String(30),
        nullable=True,
    )

    # Used when compensation is fixed.
    budget = Column(
        DECIMAL(12, 2),
        nullable=True,
    )

    # Used when the business provides a range.
    budget_min = Column(
        DECIMAL(12, 2),
        nullable=True,
    )

    budget_max = Column(
        DECIMAL(12, 2),
        nullable=True,
    )

    # Optional additional compensation information.
    compensation_description = Column(
        Text,
        nullable=True,
    )

    # ============================================================
    # TIMELINE
    # ============================================================

    start_date = Column(
        DateTime(timezone=True),
        nullable=True,
    )

    end_date = Column(
        DateTime(timezone=True),
        nullable=True,
    )

    application_deadline = Column(
        DateTime(timezone=True),
        nullable=True,
    )

    # ============================================================
    # SCREENING
    # ============================================================

    # Optional questions the creator answers while applying.
    application_questions = Column(
        JSON,
        nullable=True,
    )

    # ============================================================
    # CAMPAIGN IMAGE
    # ============================================================

    hero_image = Column(
        String(500),
        nullable=True,
    )

    # ============================================================
    # STATUS
    # ============================================================

    status = Column(
        Enum(CampaignStatus),
        default=CampaignStatus.DRAFT,
        nullable=False,
    )

    is_active = Column(
        Boolean,
        default=True,
        nullable=False,
    )

    # ============================================================
    # TIMESTAMPS
    # ============================================================

    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    updated_at = Column(
        DateTime(timezone=True),
        onupdate=func.now(),
    )

    # ============================================================
    # RELATIONSHIPS
    # ============================================================

    business = relationship(
        "User",
        foreign_keys=[business_id],
    )

    applications = relationship(
        "Application",
        back_populates="campaign",
        cascade="all, delete-orphan",
    )

    saved_by = relationship(
        "SavedCampaign",
        back_populates="campaign",
        cascade="all, delete-orphan",
    )