from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime

# ============================================
# PORTFOLIO
# ============================================

class CreatorPortfolioItem(BaseModel):
    title: str = Field(..., min_length=1)
    description: Optional[str] = None
    media_url: str = Field(..., min_length=1)
    platform: Optional[str] = None
    type: Optional[str] = None  # image, video, reel, link

# ============================================
# SOCIALS
# ============================================
# NOTE: previously CreatorOnboardingComplete.socials was a fixed object
# (CreatorSocialsData) with exactly instagram/tiktok/youtube keys and a
# connected/handle shape. That rejected any other platform (Facebook,
# X/Twitter, "Other") and had nowhere to put follower_count, even
# though the CreatorSocial model supports both. Now it's just a list
# of CreatorSocialBase, matching what the onboarding form actually
# collects and what the DB model already supports. Kept the class name
# CreatorSocialBase (rather than introducing a new one) since it's
# imported elsewhere via app/schemas/__init__.py.

class CreatorSocialBase(BaseModel):
    platform: str = Field(..., min_length=1)
    username: Optional[str] = None
    profile_url: Optional[str] = None
    follower_count: Optional[int] = 0
    is_verified: Optional[bool] = False

# Kept for backward compatibility — app/schemas/__init__.py imports
# these by name. No longer used by CreatorOnboardingComplete (that now
# takes a plain List[CreatorSocialBase] instead), but removing them
# outright breaks the import chain elsewhere until every importer of
# app.schemas is confirmed clear of them. Safe to delete once nothing
# in the codebase references CreatorSocialConnect / CreatorSocialsData.

class CreatorSocialConnect(BaseModel):
    connected: bool
    handle: Optional[str] = None

class CreatorSocialsData(BaseModel):
    instagram: CreatorSocialConnect
    tiktok: CreatorSocialConnect
    youtube: CreatorSocialConnect

# ============================================
# COMPLETE ONBOARDING
# ============================================

class CreatorOnboardingComplete(BaseModel):
    # ===== BASIC INFO =====
    display_name: str = Field(..., min_length=1)
    username: str = Field(..., min_length=3, max_length=24, pattern=r"^[a-zA-Z0-9_]+$")
    bio: str = Field(..., max_length=500)
    location: str = Field(..., min_length=1)
    profile_image: Optional[str] = None

    # ===== TYPE & NICHE =====
    creator_type: str = Field(..., min_length=1)  # UGC, Influencer, etc.
    niches: List[str] = Field(..., min_items=1)
    content_languages: List[str] = Field(..., min_items=1)
    content_types: List[str] = Field(..., min_items=1)

    # ===== AUDIENCE =====
    audience_age_range: List[str] = Field(..., min_items=1)
    audience_location: List[str] = Field(..., min_items=1)
    audience_interests: List[str] = Field(..., min_items=1)

    # ===== SOCIALS =====
    socials: List[CreatorSocialBase] = Field(..., min_items=1)

    # ===== PORTFOLIO =====
    # Not collected by the onboarding UI yet — kept optional so the
    # existing 4-step flow can ship without a portfolio builder.
    portfolio: List[CreatorPortfolioItem] = Field(default_factory=list)

    # ===== PRICING =====
    starting_price: float = Field(..., ge=0)

# ============================================
# PARTIAL PROGRESS (resume-where-you-left-off)
# ============================================
# Same fields as CreatorOnboardingComplete, but every field is optional
# and unconstrained (no min_items/min_length) since a single step's
# "Continue" click only ever has a slice of the full picture filled
# in. The PATCH /creator/progress route below only touches whatever
# fields are actually present in the request (`exclude_unset=True`),
# so this never wipes out data from a step the client didn't send.

class CreatorOnboardingProgress(BaseModel):
    # ===== BASIC INFO =====
    display_name: Optional[str] = None
    username: Optional[str] = Field(None, min_length=3, max_length=24, pattern=r"^[a-zA-Z0-9_]+$")
    bio: Optional[str] = Field(None, max_length=500)
    location: Optional[str] = None
    profile_image: Optional[str] = None

    # ===== TYPE & NICHE =====
    creator_type: Optional[str] = None
    niches: Optional[List[str]] = None
    content_languages: Optional[List[str]] = None
    content_types: Optional[List[str]] = None

    # ===== AUDIENCE =====
    audience_age_range: Optional[List[str]] = None
    audience_location: Optional[List[str]] = None
    audience_interests: Optional[List[str]] = None

    # ===== SOCIALS =====
    socials: Optional[List[CreatorSocialBase]] = None

    # ===== PORTFOLIO =====
    portfolio: Optional[List[CreatorPortfolioItem]] = None

    # ===== PRICING =====
    starting_price: Optional[float] = Field(None, ge=0)