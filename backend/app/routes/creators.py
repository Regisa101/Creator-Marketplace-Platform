import math
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import User, CreatorProfile, CreatorShortlist, CreatorInvite, Campaign
from app.schemas.creator_discovery import (
    CreatorListItem,
    CreatorListResponse,
    PublicCreatorProfile,
    ShortlistEntry,
    CreatorInviteCreate,
    CreatorInviteUpdate,
    CreatorInviteResponse,
)
from app.dependencies.auth import get_current_user, get_current_business, get_current_creator

router = APIRouter(prefix="/api/creators", tags=["Creators"])


def _to_list_item(profile: CreatorProfile, shortlisted_ids: set) -> CreatorListItem:
    return CreatorListItem(
        id=profile.user_id,
        display_name=profile.display_name,
        username=profile.username,
        bio=profile.bio,
        location=profile.location,
        profile_image=profile.profile_image,
        creator_type=profile.creator_type,
        categories=profile.categories or [],
        content_types=profile.content_types or [],
        starting_price=float(profile.starting_price) if profile.starting_price is not None else None,
        is_shortlisted=profile.user_id in shortlisted_ids,
    )


# NOTE: this route must be declared before "/{creator_id}" or FastAPI
# will try to parse "shortlist" as an int path param and 422.
@router.get("/shortlist", response_model=list[ShortlistEntry])
async def get_shortlist(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_business),
):
    entries = (
        db.query(CreatorShortlist)
        .filter(CreatorShortlist.business_id == current_user.id)
        .order_by(CreatorShortlist.created_at.desc())
        .all()
    )

    shortlisted_ids = {e.creator_id for e in entries}
    result = []
    for entry in entries:
        profile = db.query(CreatorProfile).filter(CreatorProfile.user_id == entry.creator_id).first()
        if not profile:
            continue
        result.append(
            ShortlistEntry(
                id=entry.id,
                creator_id=entry.creator_id,
                created_at=entry.created_at,
                creator=_to_list_item(profile, shortlisted_ids),
            )
        )
    return result


@router.get("/invites", response_model=list[CreatorInviteResponse])
async def get_invites(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Businesses see invites they've sent; creators see invites they've received."""
    query = db.query(CreatorInvite)
    if current_user.role == "business":
        query = query.filter(CreatorInvite.business_id == current_user.id)
    elif current_user.role == "creator":
        query = query.filter(CreatorInvite.creator_id == current_user.id)

    invites = query.order_by(CreatorInvite.created_at.desc()).all()

    results = []
    for invite in invites:
        business = db.query(User).filter(User.id == invite.business_id).first()
        creator = db.query(User).filter(User.id == invite.creator_id).first()
        campaign = (
            db.query(Campaign).filter(Campaign.id == invite.campaign_id).first()
            if invite.campaign_id
            else None
        )
        results.append(
            CreatorInviteResponse(
                id=invite.id,
                business_id=invite.business_id,
                creator_id=invite.creator_id,
                campaign_id=invite.campaign_id,
                message=invite.message,
                status=invite.status,
                created_at=invite.created_at,
                updated_at=invite.updated_at,
                business_name=(business.profile or {}).get("company_name") if business else None,
                creator_name=(creator.profile or {}).get("display_name") if creator else (creator.full_name if creator else None),
                campaign_title=campaign.title if campaign else None,
            )
        )
    return results


@router.put("/invites/{invite_id}", response_model=CreatorInviteResponse)
async def respond_to_invite(
    invite_id: int,
    data: CreatorInviteUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_creator),
):
    invite = db.query(CreatorInvite).filter(CreatorInvite.id == invite_id).first()
    if not invite:
        raise HTTPException(status_code=404, detail="Invite not found")
    if invite.creator_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not your invite")
    if data.status not in ("accepted", "declined"):
        raise HTTPException(status_code=400, detail="Status must be 'accepted' or 'declined'")

    invite.status = data.status
    db.commit()
    db.refresh(invite)

    business = db.query(User).filter(User.id == invite.business_id).first()
    campaign = (
        db.query(Campaign).filter(Campaign.id == invite.campaign_id).first()
        if invite.campaign_id
        else None
    )
    return CreatorInviteResponse(
        id=invite.id,
        business_id=invite.business_id,
        creator_id=invite.creator_id,
        campaign_id=invite.campaign_id,
        message=invite.message,
        status=invite.status,
        created_at=invite.created_at,
        updated_at=invite.updated_at,
        business_name=(business.profile or {}).get("company_name") if business else None,
        creator_name=current_user.profile.get("display_name") if current_user.profile else current_user.full_name,
        campaign_title=campaign.title if campaign else None,
    )


@router.get("", response_model=CreatorListResponse)
async def get_creators(
    search: Optional[str] = Query(None, description="Search name, username, or bio"),
    category: Optional[str] = Query(None, description="Filter by niche/category"),
    location: Optional[str] = Query(None, description="Filter by location"),
    min_price: Optional[float] = Query(None),
    max_price: Optional[float] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(12, ge=1, le=50),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = db.query(CreatorProfile).filter(CreatorProfile.is_published.is_(True))

    if search:
        from sqlalchemy import func, or_

        like = f"%{search.lower()}%"
        query = query.filter(
            or_(
                func.lower(CreatorProfile.display_name).like(like),
                func.lower(CreatorProfile.username).like(like),
                func.lower(CreatorProfile.bio).like(like),
            )
        )

    if location:
        query = query.filter(CreatorProfile.location.ilike(f"%{location}%"))

    if min_price is not None:
        query = query.filter(CreatorProfile.starting_price >= min_price)
    if max_price is not None:
        query = query.filter(CreatorProfile.starting_price <= max_price)

    all_profiles = query.order_by(CreatorProfile.updated_at.desc().nullslast()).all()

    # categories is a JSON list column — filter in Python since JSON
    # "contains" support varies across SQLite/Postgres setups.
    if category:
        all_profiles = [p for p in all_profiles if category in (p.categories or [])]

    total = len(all_profiles)
    pages = max(1, math.ceil(total / limit))
    start = (page - 1) * limit
    page_profiles = all_profiles[start : start + limit]

    shortlisted_ids = set()
    if current_user.role == "business":
        shortlisted_ids = {
            row.creator_id
            for row in db.query(CreatorShortlist).filter(CreatorShortlist.business_id == current_user.id).all()
        }

    return CreatorListResponse(
        creators=[_to_list_item(p, shortlisted_ids) for p in page_profiles],
        total=total,
        page=page,
        limit=limit,
        pages=pages,
    )


@router.get("/{creator_id}", response_model=PublicCreatorProfile)
async def get_creator_profile(
    creator_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    profile = (
        db.query(CreatorProfile)
        .filter(CreatorProfile.user_id == creator_id, CreatorProfile.is_published.is_(True))
        .first()
    )
    if not profile:
        raise HTTPException(status_code=404, detail="Creator profile not found")

    is_shortlisted = False
    if current_user.role == "business":
        is_shortlisted = (
            db.query(CreatorShortlist)
            .filter(CreatorShortlist.business_id == current_user.id, CreatorShortlist.creator_id == creator_id)
            .first()
            is not None
        )

    creator_user = db.query(User).filter(User.id == creator_id).first()
    socials = (creator_user.profile or {}).get("socials", []) if creator_user else []

    return PublicCreatorProfile(
        id=profile.user_id,
        display_name=profile.display_name,
        username=profile.username,
        bio=profile.bio,
        location=profile.location,
        profile_image=profile.profile_image,
        creator_type=profile.creator_type,
        categories=profile.categories or [],
        content_types=profile.content_types or [],
        languages=profile.languages or [],
        audience_age_range=profile.audience_age_range or [],
        audience_location=profile.audience_location or [],
        interests=profile.interests or [],
        starting_price=float(profile.starting_price) if profile.starting_price is not None else None,
        portfolio=profile.portfolio or [],
        socials=socials,
        is_shortlisted=is_shortlisted,
    )


@router.post("/{creator_id}/shortlist", response_model=ShortlistEntry)
async def add_to_shortlist(
    creator_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_business),
):
    profile = db.query(CreatorProfile).filter(CreatorProfile.user_id == creator_id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Creator not found")

    existing = (
        db.query(CreatorShortlist)
        .filter(CreatorShortlist.business_id == current_user.id, CreatorShortlist.creator_id == creator_id)
        .first()
    )
    if existing:
        entry = existing
    else:
        entry = CreatorShortlist(business_id=current_user.id, creator_id=creator_id)
        db.add(entry)
        db.commit()
        db.refresh(entry)

    shortlisted_ids = {creator_id}
    return ShortlistEntry(
        id=entry.id,
        creator_id=entry.creator_id,
        created_at=entry.created_at,
        creator=_to_list_item(profile, shortlisted_ids),
    )


@router.delete("/{creator_id}/shortlist")
async def remove_from_shortlist(
    creator_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_business),
):
    entry = (
        db.query(CreatorShortlist)
        .filter(CreatorShortlist.business_id == current_user.id, CreatorShortlist.creator_id == creator_id)
        .first()
    )
    if not entry:
        raise HTTPException(status_code=404, detail="Not in shortlist")

    db.delete(entry)
    db.commit()
    return {"message": "Removed from shortlist"}


@router.post("/{creator_id}/invite", response_model=CreatorInviteResponse)
async def invite_creator(
    creator_id: int,
    data: CreatorInviteCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_business),
):
    creator = db.query(User).filter(User.id == creator_id, User.role == "creator").first()
    if not creator:
        raise HTTPException(status_code=404, detail="Creator not found")

    campaign = None
    if data.campaign_id is not None:
        campaign = db.query(Campaign).filter(Campaign.id == data.campaign_id).first()
        if not campaign:
            raise HTTPException(status_code=404, detail="Campaign not found")
        if campaign.business_id != current_user.id:
            raise HTTPException(status_code=403, detail="Not your campaign")

    invite = CreatorInvite(
        business_id=current_user.id,
        creator_id=creator_id,
        campaign_id=data.campaign_id,
        message=data.message,
    )
    db.add(invite)
    db.commit()
    db.refresh(invite)

    return CreatorInviteResponse(
        id=invite.id,
        business_id=invite.business_id,
        creator_id=invite.creator_id,
        campaign_id=invite.campaign_id,
        message=invite.message,
        status=invite.status,
        created_at=invite.created_at,
        updated_at=invite.updated_at,
        business_name=(current_user.profile or {}).get("company_name"),
        creator_name=(creator.profile or {}).get("display_name") if creator.profile else creator.full_name,
        campaign_title=campaign.title if campaign else None,
    )