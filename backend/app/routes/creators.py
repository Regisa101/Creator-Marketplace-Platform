from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies.auth import get_current_user
from app.models import User, CreatorProfile

router = APIRouter(prefix="/api/creators", tags=["Creators"])


@router.get("/{creator_id}")
async def get_creator_profile(
    creator_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    profile = db.query(CreatorProfile).filter(CreatorProfile.user_id == creator_id).first()
    creator = db.query(User).filter(User.id == creator_id, User.role == "creator").first()
    if not profile or not creator:
        raise HTTPException(status_code=404, detail="Creator profile not found")

    return {
        "id": creator.id,
        "display_name": profile.display_name or creator.full_name,
        "username": profile.username,
        "bio": profile.bio,
        "location": profile.location,
        "profile_image": profile.profile_image,
        "creator_type": profile.creator_type,
        "categories": profile.categories or [],
        "content_types": profile.content_types or [],
        "languages": profile.languages or [],
        "audience_age_range": profile.audience_age_range or [],
        "audience_location": profile.audience_location or [],
        "interests": profile.interests or [],
        "starting_price": float(profile.starting_price) if profile.starting_price is not None else None,
        "portfolio": profile.portfolio or [],
        "socials": [
            {
                "platform": s.platform,
                "username": s.username,
                "profile_url": s.profile_url,
                "follower_count": s.follower_count,
                "is_verified": getattr(s, "is_verified", False),
            }
            for s in (profile.socials or [])
        ],
        "is_shortlisted": False,
        "avg_rating": None,
        "ratings_count": 0,
    }
