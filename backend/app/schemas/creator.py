from typing import List, Optional
from pydantic import BaseModel, Field


class CreatorPortfolioItem(BaseModel):
    title: str = Field(..., min_length=1)
    description: Optional[str] = None
    media_url: str = Field(..., min_length=1)
    platform: Optional[str] = None
    type: Optional[str] = None


class CreatorSocialBase(BaseModel):
    platform: str = Field(..., min_length=1)
    username: Optional[str] = None
    profile_url: Optional[str] = None
    follower_count: Optional[int] = 0
    is_verified: Optional[bool] = False


class CreatorOnboardingComplete(BaseModel):
    display_name: str = Field(..., min_length=1, max_length=100)
    username: str = Field(..., min_length=3, max_length=24, pattern=r'^[a-zA-Z0-9_]+$')
    location: str = Field(..., min_length=1, max_length=100)
    creator_type: str = Field(..., min_length=1, max_length=255)
    profile_image: str = Field(..., min_length=1)

    bio: Optional[str] = Field(None, max_length=500)
    niches: List[str] = Field(default_factory=list)
    content_languages: List[str] = Field(default_factory=list)
    content_types: List[str] = Field(default_factory=list)
    audience_age_range: List[str] = Field(default_factory=list)
    audience_location: List[str] = Field(default_factory=list)
    audience_interests: List[str] = Field(default_factory=list)
    socials: List[CreatorSocialBase] = Field(default_factory=list)
    portfolio: List[CreatorPortfolioItem] = Field(default_factory=list)
    availability: Optional[str] = None


class CreatorOnboardingProgress(BaseModel):
    display_name: Optional[str] = None
    username: Optional[str] = Field(None, min_length=3, max_length=24, pattern=r'^[a-zA-Z0-9_]+$')
    location: Optional[str] = None
    creator_type: Optional[str] = Field(None, max_length=255)
    profile_image: Optional[str] = None
    bio: Optional[str] = Field(None, max_length=500)
    niches: Optional[List[str]] = None
    content_languages: Optional[List[str]] = None
    content_types: Optional[List[str]] = None
    socials: Optional[List[CreatorSocialBase]] = None
    portfolio: Optional[List[CreatorPortfolioItem]] = None
    availability: Optional[str] = None

    audience_age_range: Optional[List[str]] = None
    audience_location: Optional[List[str]] = None
    audience_interests: Optional[List[str]] = None
