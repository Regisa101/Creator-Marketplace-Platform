from __future__ import annotations

"""Complaints filed by creators and businesses.

A complaint is private: only the person who filed it and admins can see it.
It can be about another user, a campaign, or CreatorHub itself.
"""

from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import func
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies.auth import get_current_user
from app.models import Application, Campaign, Complaint, Contract, User
from app.services.complaints import (
    BUSINESS_REPORTS_CREATOR,
    CAMPAIGN_CATEGORIES,
    CREATOR_REPORTS_BUSINESS,
    MAX_COMPLAINTS_PER_DAY,
    NO_INTERACTION_NEEDED,
    OPEN_STATUSES,
    PLATFORM_CATEGORIES,
    category_label,
)
from app.services.notifications import create_notification

router = APIRouter(prefix="/api/complaints", tags=["Complaints"])


class ComplaintCreate(BaseModel):
    target_type: str = Field(pattern="^(user|campaign|platform)$")
    target_user_id: Optional[int] = None
    target_campaign_id: Optional[int] = None
    contract_id: Optional[int] = None
    category: str = Field(min_length=2, max_length=50)
    description: str = Field(min_length=20, max_length=2000)
    evidence_urls: list[str] = Field(default_factory=list, max_length=5)


def display_name(user: Optional[User]) -> str:
    if not user:
        return "Unknown"
    if user.role == "creator" and user.creator_profile and user.creator_profile.display_name:
        return user.creator_profile.display_name
    if user.role == "business" and user.business_profile and user.business_profile.company_name:
        return user.business_profile.company_name
    return user.full_name


def _have_worked_together(db: Session, a: User, b: User) -> bool:
    """True when the two users share a contract, or the creator applied to one of the business's campaigns."""
    creator, business = (a, b) if a.role == "creator" else (b, a)
    contract = (
        db.query(Contract.id)
        .filter(Contract.creator_id == creator.id, Contract.business_id == business.id)
        .first()
    )
    if contract:
        return True
    application = (
        db.query(Application.id)
        .join(Campaign, Campaign.id == Application.campaign_id)
        .filter(Application.creator_id == creator.id, Campaign.business_id == business.id)
        .first()
    )
    return application is not None


def _serialize(db: Session, c: Complaint) -> dict:
    target_name: Optional[str] = None
    if c.target_type == "platform":
        target_name = "CreatorHub"
    elif c.target_type == "campaign":
        campaign = db.query(Campaign).filter(Campaign.id == c.target_campaign_id).first()
        target_name = campaign.title if campaign else "Campaign"
    else:
        target_name = display_name(db.query(User).filter(User.id == c.target_user_id).first())
    return {
        "id": c.id,
        "target_type": c.target_type,
        "target_name": target_name,
        "category": c.category,
        "category_label": category_label(c.category),
        "description": c.description,
        "status": c.status,
        "created_at": c.created_at,
    }


@router.post("", status_code=201)
async def file_complaint(
    data: ComplaintCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Restricted users may still file complaints (and appeal) on purpose.
    if current_user.role not in ("creator", "business"):
        raise HTTPException(status_code=403, detail="Only creators and businesses can file complaints.")

    since = datetime.now(timezone.utc) - timedelta(days=1)
    filed_today = (
        db.query(func.count(Complaint.id))
        .filter(Complaint.reporter_id == current_user.id, Complaint.created_at >= since)
        .scalar()
        or 0
    )
    if filed_today >= MAX_COMPLAINTS_PER_DAY:
        raise HTTPException(status_code=429, detail="You have filed several complaints today. Please try again tomorrow.")

    description = data.description.strip()
    if len(description) < 20:
        raise HTTPException(status_code=400, detail="Please describe the problem in at least 20 characters.")

    evidence = [u.strip() for u in data.evidence_urls if u and u.strip()][:5]
    for url in evidence:
        if not url.lower().startswith(("http://", "https://")):
            raise HTTPException(status_code=400, detail="Evidence links must start with http:// or https://")

    target_user_id: Optional[int] = None
    target_campaign_id: Optional[int] = None
    target_user: Optional[User] = None

    if data.target_type == "platform":
        if data.category not in PLATFORM_CATEGORIES:
            raise HTTPException(status_code=400, detail="Choose a valid complaint category.")

    elif data.target_type == "user":
        if not data.target_user_id:
            raise HTTPException(status_code=400, detail="Choose who you are reporting.")
        if data.target_user_id == current_user.id:
            raise HTTPException(status_code=400, detail="You cannot report yourself.")
        target_user = db.query(User).filter(User.id == data.target_user_id).first()
        expected_role = "business" if current_user.role == "creator" else "creator"
        if not target_user or target_user.role != expected_role:
            raise HTTPException(status_code=404, detail="That account could not be found.")
        allowed = CREATOR_REPORTS_BUSINESS if current_user.role == "creator" else BUSINESS_REPORTS_CREATOR
        if data.category not in allowed:
            raise HTTPException(status_code=400, detail="Choose a valid complaint category.")
        if data.category not in NO_INTERACTION_NEEDED and not _have_worked_together(db, current_user, target_user):
            raise HTTPException(
                status_code=403,
                detail="You can only report people you have applied to, hired or worked with.",
            )
        target_user_id = target_user.id

    else:  # campaign
        if current_user.role != "creator":
            raise HTTPException(status_code=403, detail="Only creators can report a campaign.")
        if not data.target_campaign_id:
            raise HTTPException(status_code=400, detail="Choose the campaign you are reporting.")
        campaign = db.query(Campaign).filter(Campaign.id == data.target_campaign_id).first()
        if not campaign:
            raise HTTPException(status_code=404, detail="Campaign not found.")
        if data.category not in CAMPAIGN_CATEGORIES:
            raise HTTPException(status_code=400, detail="Choose a valid complaint category.")
        if data.category not in NO_INTERACTION_NEEDED:
            applied = (
                db.query(Application.id)
                .filter(Application.campaign_id == campaign.id, Application.creator_id == current_user.id)
                .first()
            )
            if not applied:
                raise HTTPException(status_code=403, detail="You can only report campaigns you have applied to.")
        target_campaign_id = campaign.id
        # Count it against the owner too, so repeat problems add up.
        target_user_id = campaign.business_id if campaign.business_id != current_user.id else None

    if data.contract_id:
        contract = db.query(Contract).filter(Contract.id == data.contract_id).first()
        if not contract or current_user.id not in (contract.creator_id, contract.business_id):
            raise HTTPException(status_code=404, detail="Contract not found.")

    duplicate = (
        db.query(Complaint.id)
        .filter(
            Complaint.reporter_id == current_user.id,
            Complaint.target_type == data.target_type,
            Complaint.target_user_id.is_(target_user_id) if target_user_id is None else Complaint.target_user_id == target_user_id,
            Complaint.target_campaign_id.is_(target_campaign_id) if target_campaign_id is None else Complaint.target_campaign_id == target_campaign_id,
            Complaint.category == data.category,
            Complaint.status.in_(OPEN_STATUSES),
        )
        .first()
    )
    if duplicate:
        raise HTTPException(status_code=409, detail="You already have an open complaint about this. We are looking into it.")

    complaint = Complaint(
        reporter_id=current_user.id,
        target_type=data.target_type,
        target_user_id=target_user_id,
        target_campaign_id=target_campaign_id,
        contract_id=data.contract_id,
        category=data.category,
        description=description,
        evidence_urls=evidence or None,
        status="new",
    )
    db.add(complaint)
    db.flush()

    # Let every admin know.
    for admin in db.query(User).filter(User.role == "admin", User.is_active.is_(True)).all():
        create_notification(
            db,
            user_id=admin.id,
            type="complaint_filed",
            title="New complaint",
            message=f"{display_name(current_user)} filed a complaint: {category_label(data.category)}.",
            link="/admin/complaints",
            reference_id=complaint.id,
            event_key=f"complaint_filed_{complaint.id}_{admin.id}",
        )
    db.commit()
    db.refresh(complaint)
    return _serialize(db, complaint)


@router.get("/mine")
async def my_complaints(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    rows = (
        db.query(Complaint)
        .filter(Complaint.reporter_id == current_user.id)
        .order_by(Complaint.created_at.desc())
        .limit(100)
        .all()
    )
    return [_serialize(db, c) for c in rows]


@router.get("/received")
async def received_complaints(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Complaints other people filed about this user or their campaigns.

    The reporter's name and what they wrote stay private. The person only sees
    what kind of problem it was, when it was filed, and where it stands.
    """
    my_campaign_ids = [
        row[0] for row in db.query(Campaign.id).filter(Campaign.business_id == current_user.id).all()
    ]
    conditions = [
        (Complaint.target_type == "user") & (Complaint.target_user_id == current_user.id)
    ]
    if my_campaign_ids:
        conditions.append(
            (Complaint.target_type == "campaign") & (Complaint.target_campaign_id.in_(my_campaign_ids))
        )

    rows = (
        db.query(Complaint)
        .filter(or_(*conditions))
        .order_by(Complaint.created_at.desc())
        .limit(100)
        .all()
    )

    titles = {}
    if rows:
        ids = {c.target_campaign_id for c in rows if c.target_campaign_id}
        if ids:
            titles = {cid: t for cid, t in db.query(Campaign.id, Campaign.title).filter(Campaign.id.in_(ids)).all()}

    return [
        {
            "id": c.id,
            "category_label": category_label(c.category),
            "about": titles.get(c.target_campaign_id, "Your campaign") if c.target_type == "campaign" else "You",
            "status": c.status,
            "created_at": c.created_at,
        }
        for c in rows
    ]