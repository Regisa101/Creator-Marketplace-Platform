from __future__ import annotations

"""Admin view of complaints: review them, spot repeat problems, close them out."""

import math
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session, aliased

from app.database import get_db
from app.dependencies.auth import get_current_admin
from app.models import Campaign, Complaint, User
from app.routes.complaints import display_name
from app.services.complaints import (
    COMPLAINT_STATUSES,
    REPEAT_THRESHOLD,
    category_label,
    user_complaint_stats,
)
from app.services.notifications import create_notification

router = APIRouter(prefix="/api/admin/complaints", tags=["Admin complaints"])


class ComplaintUpdate(BaseModel):
    status: Optional[str] = Field(default=None, pattern="^(new|under_review|upheld|dismissed)$")
    admin_note: Optional[str] = Field(default=None, max_length=2000)


def _like(term: str) -> str:
    escaped = term.strip().replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")
    return f"%{escaped}%"


def _target(db: Session, c: Complaint) -> dict:
    if c.target_type == "platform":
        return {"type": "platform", "user_id": None, "name": "CreatorHub", "role": None, "campaign_id": None, "status": None}

    user = db.query(User).filter(User.id == c.target_user_id).first() if c.target_user_id else None
    campaign = db.query(Campaign).filter(Campaign.id == c.target_campaign_id).first() if c.target_campaign_id else None
    if c.target_type == "campaign":
        return {
            "type": "campaign",
            "user_id": c.target_user_id,
            "name": campaign.title if campaign else "Campaign",
            "owner": display_name(user) if user else None,
            "role": "business",
            "campaign_id": c.target_campaign_id,
            "status": "restricted" if campaign and campaign.is_restricted else "active",
        }
    return {
        "type": "user",
        "user_id": c.target_user_id,
        "name": display_name(user),
        "role": user.role if user else None,
        "campaign_id": None,
        "status": "restricted" if user and user.is_restricted else "active",
    }


def _row(db: Session, c: Complaint) -> dict:
    reporter = db.query(User).filter(User.id == c.reporter_id).first()
    target = _target(db, c)
    repeat = None
    if c.target_user_id:
        stats = user_complaint_stats(db, c.target_user_id)
        repeat = {
            "unique_reporters": stats["unique_reporters"],
            "top_category_reporters": stats["top_category_reporters"],
            "flagged": stats["flagged"],
        }
    return {
        "id": c.id,
        "created_at": c.created_at,
        "status": c.status,
        "category": c.category,
        "category_label": category_label(c.category),
        "target_type": c.target_type,
        "reporter": {"id": c.reporter_id, "name": display_name(reporter), "role": reporter.role if reporter else None},
        "target": target,
        "repeat": repeat,
    }


@router.get("")
async def list_complaints(
    status: str = Query("all", pattern="^(all|new|under_review|upheld|dismissed)$"),
    target_type: str = Query("all", pattern="^(all|user|campaign|platform)$"),
    flagged: bool = Query(False),
    search: Optional[str] = Query(None, max_length=100),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin),
):
    Reporter = aliased(User)
    Target = aliased(User)
    base = (
        db.query(Complaint)
        .join(Reporter, Reporter.id == Complaint.reporter_id)
        .outerjoin(Target, Target.id == Complaint.target_user_id)
        .outerjoin(Campaign, Campaign.id == Complaint.target_campaign_id)
    )
    if target_type != "all":
        base = base.filter(Complaint.target_type == target_type)
    if search and search.strip():
        term = _like(search)
        base = base.filter(
            or_(
                Reporter.full_name.ilike(term, escape="\\"),
                Reporter.email.ilike(term, escape="\\"),
                Target.full_name.ilike(term, escape="\\"),
                Target.email.ilike(term, escape="\\"),
                Campaign.title.ilike(term, escape="\\"),
            )
        )
    if flagged:
        # Repeat problems: reported by REPEAT_THRESHOLD or more different users,
        # or by 2+ different users for the same category.
        live = (Complaint.target_user_id.isnot(None), Complaint.status != "dismissed")
        many_reporters = (
            select(Complaint.target_user_id)
            .where(*live)
            .group_by(Complaint.target_user_id)
            .having(func.count(func.distinct(Complaint.reporter_id)) >= REPEAT_THRESHOLD)
        )
        same_category = (
            select(Complaint.target_user_id)
            .where(*live)
            .group_by(Complaint.target_user_id, Complaint.category)
            .having(func.count(func.distinct(Complaint.reporter_id)) >= 2)
        )
        base = base.filter(
            or_(Complaint.target_user_id.in_(many_reporters), Complaint.target_user_id.in_(same_category))
        )

    count_rows = dict(
        base.order_by(None).with_entities(Complaint.status, func.count(Complaint.id)).group_by(Complaint.status).all()
    )
    counts = {s: int(count_rows.get(s, 0)) for s in COMPLAINT_STATUSES}
    counts["all"] = sum(counts.values())

    q = base
    if status != "all":
        q = q.filter(Complaint.status == status)
    q = q.order_by(Complaint.created_at.desc(), Complaint.id.desc())

    total = q.order_by(None).count()
    rows = q.limit(page_size).offset((page - 1) * page_size).all()
    return {
        "items": [_row(db, c) for c in rows],
        "counts": counts,
        "page": page,
        "page_size": page_size,
        "total": total,
        "total_pages": max(1, math.ceil(total / page_size)),
    }


@router.get("/{complaint_id}")
async def complaint_detail(
    complaint_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin),
):
    c = db.query(Complaint).filter(Complaint.id == complaint_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Complaint not found.")

    data = _row(db, c)
    related = []
    if c.target_user_id:
        others = (
            db.query(Complaint)
            .filter(Complaint.target_user_id == c.target_user_id, Complaint.id != c.id)
            .order_by(Complaint.created_at.desc())
            .limit(20)
            .all()
        )
        for o in others:
            reporter = db.query(User).filter(User.id == o.reporter_id).first()
            related.append(
                {
                    "id": o.id,
                    "category": o.category,
                    "category_label": category_label(o.category),
                    "status": o.status,
                    "created_at": o.created_at,
                    "reporter": display_name(reporter),
                }
            )
    data.update(
        {
            "description": c.description,
            "evidence_urls": c.evidence_urls or [],
            "contract_id": c.contract_id,
            "admin_note": c.admin_note,
            "reviewed_at": c.reviewed_at,
            "related": related,
        }
    )
    return data


@router.patch("/{complaint_id}")
async def update_complaint(
    complaint_id: int,
    data: ComplaintUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin),
):
    c = db.query(Complaint).filter(Complaint.id == complaint_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Complaint not found.")

    if data.admin_note is not None:
        c.admin_note = data.admin_note.strip() or None

    if data.status and data.status != c.status:
        c.status = data.status
        if data.status in ("upheld", "dismissed"):
            c.reviewed_by = current_user.id
            c.reviewed_at = datetime.now(timezone.utc)
            create_notification(
                db,
                user_id=c.reporter_id,
                type="complaint_resolved",
                title="Your complaint was reviewed",
                message=(
                    "Thank you for reporting this. We reviewed your complaint and took action."
                    if data.status == "upheld"
                    else "Thank you for reporting this. We reviewed your complaint and could not take action at this time."
                ),
                link="/complaints",
                reference_id=c.id,
                event_key=f"complaint_{c.id}_{data.status}",
            )
    db.commit()
    return {"id": c.id, "status": c.status}