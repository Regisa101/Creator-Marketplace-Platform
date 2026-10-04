from __future__ import annotations

"""CreatorHub admin API.

Every endpoint depends on get_current_admin, so a creator or business token
gets 403 no matter what the frontend shows. All numbers are computed in SQL.

Revenue definition (matches how the rest of the app stores money):
CreatorHub only processes its own service fee. A platform_fee Payment row's
`amount` IS the fee (10% charged on top of the creator's compensation), and
creator compensation is settled directly between business and creator. So
platform revenue = SUM(Payment.amount) over paid fee payments. Creator
compensation is never counted as revenue.
"""

import math
from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session, aliased

from app.database import get_db
from app.dependencies.auth import get_current_admin
from app.models import (
    Application,
    BusinessProfile,
    Campaign,
    Contract,
    CreatorProfile,
    Payment,
    User,
)
from app.models.campaign import CampaignStatus
from app.routes.applications import build_evidence_snapshot
from app.services.email_service import send_moderation_email
from app.services.pricing import candidate_rate_and_status, total_for_rate
from app.services.notifications import create_notification
from app.services.complaints import RESTRICTION_REASONS, category_label, resolve_complaints, user_complaint_stats

router = APIRouter(prefix="/api/admin", tags=["Admin"])

BRAND = "CreatorHub"


class RestrictRequest(BaseModel):
    reason: str = Field(min_length=2, max_length=60)
    note: Optional[str] = Field(default=None, max_length=1000)
    complaint_ids: list[int] = Field(default_factory=list, max_length=50)


def _check_reason(body: RestrictRequest) -> None:
    if body.reason not in RESTRICTION_REASONS:
        raise HTTPException(status_code=400, detail="Choose a valid restriction reason.")
    if body.reason == "other" and not (body.note or "").strip():
        raise HTTPException(status_code=400, detail="Please add a note when the reason is Other.")

# Payment rows that represent CreatorHub's own fee (see models/payment.py).
FEE_TYPES = ("platform_fee", "selection_fee")
# "completed" = current flow, "funded" = legacy selection_fee rows.
PAID_STATUSES = ("completed", "funded")

# When a payment was actually collected; falls back to creation time.
FEE_TS = func.coalesce(Payment.paid_at, Payment.created_at)

MOD_STATUSES = (CampaignStatus.DRAFT, CampaignStatus.PUBLISHED, CampaignStatus.IN_PROGRESS)


# ------------------------------------------------------------------
# helpers
# ------------------------------------------------------------------

def _now() -> datetime:
    return datetime.now(timezone.utc)


def _since(range_key: str) -> Optional[datetime]:
    """Start of the selected window, or None for all time."""
    now = _now()
    if range_key == "7d":
        return now - timedelta(days=7)
    if range_key == "30d":
        return now - timedelta(days=30)
    if range_key == "90d":
        return now - timedelta(days=90)
    if range_key == "year":
        return now.replace(month=1, day=1, hour=0, minute=0, second=0, microsecond=0)
    if range_key == "all":
        return None
    raise HTTPException(status_code=400, detail="Invalid range. Use 7d, 30d, 90d, year or all.")


def _like(term: str) -> str:
    """Escape LIKE wildcards so a search for '50%' matches literally."""
    escaped = term.strip().replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")
    return f"%{escaped}%"


def _paginate(query, page: int, page_size: int):
    total = query.order_by(None).count()
    rows = query.limit(page_size).offset((page - 1) * page_size).all()
    return rows, {
        "page": page,
        "page_size": page_size,
        "total": total,
        "total_pages": max(1, math.ceil(total / page_size)),
    }


def _money(value) -> float:
    return round(float(value or 0), 2)


def _paid_fee_filters():
    return [Payment.payment_type.in_(FEE_TYPES), Payment.status.in_(PAID_STATUSES)]


def _revenue_total(db: Session, since: Optional[datetime] = None) -> float:
    q = db.query(func.coalesce(func.sum(Payment.amount), 0)).filter(*_paid_fee_filters())
    if since is not None:
        q = q.filter(FEE_TS >= since)
    return _money(q.scalar())


def _revenue_count(db: Session, since: Optional[datetime] = None) -> int:
    q = db.query(func.count(Payment.id)).filter(*_paid_fee_filters())
    if since is not None:
        q = q.filter(FEE_TS >= since)
    return int(q.scalar() or 0)


def _bucket_revenue(db: Session, since: Optional[datetime]) -> dict:
    """Revenue per day (short windows) or per month (long windows).

    Gaps inside the window are returned as 0 so the bar chart is continuous.
    """
    granularity = "day" if since is not None and (_now() - since) <= timedelta(days=31) else "month"
    # Truncate in UTC so bucket keys do not depend on the DB session timezone.
    bucket = func.date_trunc(granularity, func.timezone("UTC", FEE_TS))

    q = db.query(bucket.label("b"), func.sum(Payment.amount)).filter(*_paid_fee_filters())
    if since is not None:
        q = q.filter(FEE_TS >= since)
    totals = {row[0]: _money(row[1]) for row in q.group_by(bucket).all()}

    now = _now().replace(tzinfo=None)
    if since is not None:
        start = since.replace(tzinfo=None)
    elif totals:
        start = min(totals)
    else:
        return {"granularity": "month", "points": []}

    points = []
    if granularity == "day":
        cur = start.replace(hour=0, minute=0, second=0, microsecond=0)
        while cur <= now:
            points.append({"key": cur.strftime("%Y-%m-%d"), "label": cur.strftime("%b %d"), "revenue": totals.get(cur, 0.0)})
            cur += timedelta(days=1)
    else:
        cur = start.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        while cur <= now:
            points.append({"key": cur.strftime("%Y-%m"), "label": cur.strftime("%b %Y"), "revenue": totals.get(cur, 0.0)})
            cur = cur.replace(year=cur.year + 1, month=1) if cur.month == 12 else cur.replace(month=cur.month + 1)
    return {"granularity": granularity, "points": points}


def _business_name(profile_name: Optional[str], full_name: Optional[str], role: Optional[str] = None) -> Optional[str]:
    if role == "admin":
        return "CreatorHub"  # campaigns CreatorHub runs itself
    return profile_name or full_name


def _get_user_or_404(db: Session, user_id: int, role: str) -> User:
    user = db.query(User).filter(User.id == user_id, User.role == role).first()
    if not user:
        raise HTTPException(status_code=404, detail=f"{role.capitalize()} not found.")
    return user


def _complaints_for(db: Session, user_id: int) -> dict:
    """Complaint summary + the open complaint ids to attach to a restriction."""
    from app.models import Complaint

    stats = user_complaint_stats(db, user_id)
    open_rows = (
        db.query(Complaint)
        .filter(Complaint.target_user_id == user_id, Complaint.status.in_(("new", "under_review")))
        .order_by(Complaint.created_at.desc())
        .limit(20)
        .all()
    )
    stats["open_complaints"] = [
        {"id": c.id, "category_label": category_label(c.category), "created_at": c.created_at} for c in open_rows
    ]
    return stats


def _status_counts(base_query) -> dict:
    """all / active / restricted counts for a user query (ignores status filter)."""
    rows = dict(base_query.order_by(None).with_entities(User.is_restricted, func.count(User.id)).group_by(User.is_restricted).all())
    restricted = int(rows.get(True, 0))
    active = int(rows.get(False, 0))
    return {"all": active + restricted, "active": active, "restricted": restricted}


def _set_restriction(db: Session, user: User, restricted: bool, label: str, body: Optional[RestrictRequest] = None, admin: Optional[User] = None) -> Optional[dict]:
    """Apply the change; returns the email to send after commit, or None if nothing changed."""
    if bool(user.is_restricted) == restricted:
        return None  # already in the requested state
    user.is_restricted = restricted
    user.restricted_at = _now() if restricted else None
    if restricted and body:
        user.restriction_reason = body.reason
        user.restriction_note = (body.note or "").strip() or None
        user.restricted_by = admin.id if admin else None
    elif not restricted:
        user.restriction_reason = None
        user.restriction_note = None
        user.restricted_by = None
    reason_text = RESTRICTION_REASONS.get(body.reason) if (restricted and body) else None
    create_notification(
        db,
        user_id=user.id,
        type="account_restricted" if restricted else "account_reactivated",
        title="Account restricted" if restricted else "Account reactivated",
        message=(
            f"Your {label} account has been restricted by CreatorHub"
            + (f" (reason: {reason_text})" if reason_text else "")
            + ". You can still view your history, but you cannot start new marketplace activity."
            if restricted
            else f"Your {label} account has been reactivated. You can use CreatorHub normally again."
        ),
        link="/dashboard",
        reference_id=user.id,
    )
    db.commit()
    if restricted:
        paragraphs = [
            f"Your {label} account on {BRAND} has been restricted by our team."
            + (f" Reason: {reason_text}." if reason_text else ""),
            "You can still log in and view your campaigns, applications, contracts and payment history, "
            "but you cannot start new marketplace activity until the restriction is lifted.",
            "If you think this is a mistake, please reply to this email or contact CreatorHub support.",
        ]
        return dict(to_email=user.email, name=user.full_name, subject=f"Your {BRAND} account has been restricted",
                    headline="Account restricted", paragraphs=paragraphs)
    return dict(to_email=user.email, name=user.full_name, subject=f"Your {BRAND} account has been reactivated",
                headline="Account reactivated",
                paragraphs=[f"Good news: your {label} account on {BRAND} has been reactivated.", "You can use CreatorHub normally again."])


# ------------------------------------------------------------------
# OVERVIEW
# ------------------------------------------------------------------

@router.get("/overview")
async def admin_overview(
    range: str = Query("30d", pattern="^(7d|30d|90d|all)$"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin),
):
    since = _since(range)

    def users_of(role: str):
        return db.query(func.count(User.id)).filter(User.role == role)

    creators_total = int(users_of("creator").scalar() or 0)
    businesses_total = int(users_of("business").scalar() or 0)
    new_creators = int((users_of("creator").filter(User.created_at >= since).scalar() if since else creators_total) or 0)
    new_businesses = int((users_of("business").filter(User.created_at >= since).scalar() if since else businesses_total) or 0)

    # Active campaign = currently live in the existing status system.
    active_campaigns = int(
        db.query(func.count(Campaign.id))
        .filter(
            Campaign.status.in_([CampaignStatus.PUBLISHED, CampaignStatus.IN_PROGRESS]),
            Campaign.is_restricted.is_(False),
        )
        .scalar()
        or 0
    )

    # Campaigns created inside the window, grouped by their current status.
    cq = db.query(Campaign.status, func.count(Campaign.id))
    if since:
        cq = cq.filter(Campaign.created_at >= since)
    by_status = {(s.value if hasattr(s, "value") else str(s)): int(n) for s, n in cq.group_by(Campaign.status).all()}
    campaign_statuses = [
        {"status": s.value, "count": by_status.get(s.value, 0)}
        for s in (
            CampaignStatus.DRAFT,
            CampaignStatus.PUBLISHED,
            CampaignStatus.IN_PROGRESS,
            CampaignStatus.COMPLETED,
            CampaignStatus.CLOSED,
            CampaignStatus.CANCELLED,
        )
    ]

    return {
        "range": range,
        "cards": {
            "total_creators": creators_total,
            "total_businesses": businesses_total,
            "new_creators": new_creators,
            "new_businesses": new_businesses,
            "active_campaigns": active_campaigns,
            "platform_revenue": _revenue_total(db, since),
            "paid_contracts": _revenue_count(db, since),
        },
        "users": {"creators": creators_total, "businesses": businesses_total},
        "campaign_statuses": campaign_statuses,
        "revenue_trend": _bucket_revenue(db, since),
        "recent_activity": _recent_activity(db, since),
    }


def _recent_activity(db: Session, since: Optional[datetime], limit: int = 50) -> list[dict]:
    """Activity derived from existing rows (no separate log table exists)."""
    events: list[dict] = []

    def within(col, q):
        return q.filter(col >= since) if since else q

    # New registrations.
    for role, title in (("creator", "New creator registered"), ("business", "New business registered")):
        q = within(User.created_at, db.query(User).filter(User.role == role))
        for u in q.order_by(User.created_at.desc()).limit(limit).all():
            events.append({"type": f"{role}_registered", "title": title, "subject": u.full_name, "at": u.created_at})

    # Campaigns that left draft are public; drafts are private work in progress.
    q = within(
        Campaign.created_at,
        db.query(Campaign.id, Campaign.title, Campaign.created_at).filter(Campaign.status != CampaignStatus.DRAFT),
    )
    for c in q.order_by(Campaign.created_at.desc()).limit(limit).all():
        events.append({"type": "campaign_created", "title": "New campaign created", "subject": c.title, "at": c.created_at})

    # Fee payments collected.
    biz = aliased(User)
    q = (
        db.query(Payment.id, FEE_TS.label("at"), Campaign.title, BusinessProfile.company_name, biz.full_name, biz.role.label("owner_role"))
        .outerjoin(Campaign, Campaign.id == Payment.campaign_id)
        .outerjoin(biz, biz.id == Campaign.business_id)
        .outerjoin(BusinessProfile, BusinessProfile.user_id == biz.id)
        .filter(*_paid_fee_filters())
    )
    q = within(FEE_TS, q)
    for r in q.order_by(FEE_TS.desc()).limit(limit).all():
        subject = r.title or "Campaign"
        who = _business_name(r.company_name, r.full_name, r.owner_role)
        events.append({"type": "payment_completed", "title": "Contract payment completed", "subject": f"{subject} · {who}" if who else subject, "at": r.at})

    # Restrictions (only the current restricted_at is stored, not a full audit trail).
    q = within(User.restricted_at, db.query(User).filter(User.restricted_at.isnot(None), User.is_restricted.is_(True)))
    for u in q.order_by(User.restricted_at.desc()).limit(limit).all():
        events.append({"type": f"{u.role}_restricted", "title": f"{u.role.capitalize()} restricted", "subject": u.full_name, "at": u.restricted_at})

    q = within(Campaign.restricted_at, db.query(Campaign.id, Campaign.title, Campaign.restricted_at).filter(Campaign.restricted_at.isnot(None)))
    for c in q.order_by(Campaign.restricted_at.desc()).limit(limit).all():
        events.append({"type": "campaign_restricted", "title": "Campaign restricted", "subject": c.title, "at": c.restricted_at})

    events.sort(key=lambda e: e["at"], reverse=True)
    return events[:limit]


@router.get("/restriction-reasons")
async def restriction_reasons(current_user: User = Depends(get_current_admin)):
    return [{"value": k, "label": v} for k, v in RESTRICTION_REASONS.items()]


# ------------------------------------------------------------------
# CREATORS
# ------------------------------------------------------------------

@router.get("/creators")
async def admin_creators(
    search: Optional[str] = Query(None, max_length=100),
    status: str = Query("all", pattern="^(all|active|restricted)$"),
    sort: str = Query("newest", pattern="^(newest|oldest)$"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin),
):
    base = (
        db.query(User)
        .outerjoin(CreatorProfile, CreatorProfile.user_id == User.id)
        .filter(User.role == "creator")
    )
    if search and search.strip():
        term = _like(search)
        base = base.filter(or_(User.full_name.ilike(term, escape="\\"), User.email.ilike(term, escape="\\"), CreatorProfile.display_name.ilike(term, escape="\\")))

    counts = _status_counts(base)

    q = base
    if status == "active":
        q = q.filter(User.is_restricted.is_(False))
    elif status == "restricted":
        q = q.filter(User.is_restricted.is_(True))
    q = q.add_columns(CreatorProfile.display_name, CreatorProfile.location, CreatorProfile.profile_image)
    q = q.order_by(User.created_at.asc() if sort == "oldest" else User.created_at.desc(), User.id.desc())

    rows, meta = _paginate(q, page, page_size)
    items = [
        {
            "id": u.id,
            "name": display_name or u.full_name,
            "email": u.email,
            "location": location,
            "profile_image": image,
            "status": "restricted" if u.is_restricted else "active",
            "joined_at": u.created_at,
        }
        for u, display_name, location, image in rows
    ]
    return {"items": items, "counts": counts, **meta}


@router.get("/creators/{user_id}")
async def admin_creator_detail(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin),
):
    user = _get_user_or_404(db, user_id, "creator")
    p = user.creator_profile

    def app_count(*extra):
        return int(db.query(func.count(Application.id)).filter(Application.creator_id == user.id, *extra).scalar() or 0)

    return {
        "id": user.id,
        "name": (p.display_name if p and p.display_name else user.full_name),
        "email": user.email,
        "username": p.username if p else None,
        "profile_image": p.profile_image if p else None,
        "bio": p.bio if p else None,
        "location": p.location if p else None,
        "creator_type": p.creator_type if p else None,
        "niches": (p.categories if p else None) or [],
        "skills": (p.content_types if p else None) or [],
        "languages": (p.languages if p else None) or [],
        "socials": [
            {"platform": s.platform, "username": s.username, "profile_url": s.profile_url, "follower_count": s.follower_count}
            for s in ((p.socials if p else None) or [])
        ],
        "status": "restricted" if user.is_restricted else "active",
        "restricted_at": user.restricted_at,
        "restriction_reason": user.restriction_reason,
        "restriction_reason_label": RESTRICTION_REASONS.get(user.restriction_reason) if user.restriction_reason else None,
        "restriction_note": user.restriction_note,
        "complaints": _complaints_for(db, user.id),
        "joined_at": user.created_at,
        "stats": {
            "applications": app_count(),
            "selected_campaigns": app_count(Application.status == "accepted"),
            "completed_contracts": int(
                db.query(func.count(Contract.id)).filter(Contract.creator_id == user.id, Contract.status == "completed").scalar() or 0
            ),
        },
    }


@router.post("/creators/{user_id}/restrict")
async def restrict_creator(user_id: int, body: RestrictRequest, background_tasks: BackgroundTasks, db: Session = Depends(get_db), current_user: User = Depends(get_current_admin)):
    _check_reason(body)
    user = _get_user_or_404(db, user_id, "creator")
    email = _set_restriction(db, user, True, "creator", body, current_user)
    if email:
        resolve_complaints(db, current_user, body.complaint_ids, target_user_id=user.id)
        db.commit()
        background_tasks.add_task(send_moderation_email, **email)
    return {"id": user.id, "status": "restricted"}


@router.post("/creators/{user_id}/reactivate")
async def reactivate_creator(user_id: int, background_tasks: BackgroundTasks, db: Session = Depends(get_db), current_user: User = Depends(get_current_admin)):
    user = _get_user_or_404(db, user_id, "creator")
    email = _set_restriction(db, user, False, "creator")
    if email:
        background_tasks.add_task(send_moderation_email, **email)
    return {"id": user.id, "status": "active"}


# ------------------------------------------------------------------
# BUSINESSES
# ------------------------------------------------------------------

def _campaign_count_subquery():
    # Drafts are private, so only campaigns the business has posted are counted.
    return (
        select(func.count(Campaign.id))
        .where(Campaign.business_id == User.id, Campaign.status != CampaignStatus.DRAFT)
        .correlate(User)
        .scalar_subquery()
    )


@router.get("/businesses")
async def admin_businesses(
    search: Optional[str] = Query(None, max_length=100),
    status: str = Query("all", pattern="^(all|active|restricted)$"),
    sort: str = Query("newest", pattern="^(newest|oldest)$"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin),
):
    base = (
        db.query(User)
        .outerjoin(BusinessProfile, BusinessProfile.user_id == User.id)
        .filter(User.role == "business")
    )
    if search and search.strip():
        term = _like(search)
        base = base.filter(or_(User.full_name.ilike(term, escape="\\"), User.email.ilike(term, escape="\\"), BusinessProfile.company_name.ilike(term, escape="\\")))

    counts = _status_counts(base)

    q = base
    if status == "active":
        q = q.filter(User.is_restricted.is_(False))
    elif status == "restricted":
        q = q.filter(User.is_restricted.is_(True))
    q = q.add_columns(BusinessProfile.company_name, BusinessProfile.logo_url, _campaign_count_subquery().label("campaigns"))
    q = q.order_by(User.created_at.asc() if sort == "oldest" else User.created_at.desc(), User.id.desc())

    rows, meta = _paginate(q, page, page_size)
    items = [
        {
            "id": u.id,
            "name": company_name or u.full_name,
            "email": u.email,
            "logo_url": logo,
            "status": "restricted" if u.is_restricted else "active",
            "campaigns": int(campaigns or 0),
            "joined_at": u.created_at,
        }
        for u, company_name, logo, campaigns in rows
    ]
    return {"items": items, "counts": counts, **meta}


@router.get("/businesses/{user_id}")
async def admin_business_detail(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin),
):
    user = _get_user_or_404(db, user_id, "business")
    p = user.business_profile

    def campaigns(*extra):
        return int(db.query(func.count(Campaign.id)).filter(Campaign.business_id == user.id, *extra).scalar() or 0)

    fees_paid = db.query(func.coalesce(func.sum(Payment.amount), 0)).filter(
        Payment.initiated_by == user.id, *_paid_fee_filters()
    ).scalar()
    contract_value = db.query(func.coalesce(func.sum(Contract.total_value), 0)).filter(
        Contract.business_id == user.id, Contract.status.in_(("active", "completed"))
    ).scalar()

    return {
        "id": user.id,
        "name": (p.company_name if p and p.company_name else user.full_name),
        "email": user.email,
        "logo_url": p.logo_url if p else None,
        "location": p.location if p else None,
        "description": p.description if p else None,
        "industry": p.industry if p else None,
        "website": p.website if p else None,
        "status": "restricted" if user.is_restricted else "active",
        "restricted_at": user.restricted_at,
        "restriction_reason": user.restriction_reason,
        "restriction_reason_label": RESTRICTION_REASONS.get(user.restriction_reason) if user.restriction_reason else None,
        "restriction_note": user.restriction_note,
        "complaints": _complaints_for(db, user.id),
        "joined_at": user.created_at,
        "stats": {
            "campaigns": campaigns(Campaign.status != CampaignStatus.DRAFT),
            "completed_campaigns": campaigns(Campaign.status == CampaignStatus.COMPLETED),
            "contracts": int(db.query(func.count(Contract.id)).filter(Contract.business_id == user.id).scalar() or 0),
            # Fees paid to CreatorHub (processed) vs. agreed creator compensation (settled outside CreatorHub).
            "platform_fees_paid": _money(fees_paid),
            "contract_value": _money(contract_value),
        },
    }


@router.post("/businesses/{user_id}/restrict")
async def restrict_business(user_id: int, body: RestrictRequest, background_tasks: BackgroundTasks, db: Session = Depends(get_db), current_user: User = Depends(get_current_admin)):
    _check_reason(body)
    user = _get_user_or_404(db, user_id, "business")
    email = _set_restriction(db, user, True, "business", body, current_user)
    if email:
        resolve_complaints(db, current_user, body.complaint_ids, target_user_id=user.id)
        db.commit()
        background_tasks.add_task(send_moderation_email, **email)
    return {"id": user.id, "status": "restricted"}


@router.post("/businesses/{user_id}/reactivate")
async def reactivate_business(user_id: int, background_tasks: BackgroundTasks, db: Session = Depends(get_db), current_user: User = Depends(get_current_admin)):
    user = _get_user_or_404(db, user_id, "business")
    email = _set_restriction(db, user, False, "business")
    if email:
        background_tasks.add_task(send_moderation_email, **email)
    return {"id": user.id, "status": "active"}


# ------------------------------------------------------------------
# CAMPAIGNS
# ------------------------------------------------------------------

def _parse_campaign_status(value: str) -> CampaignStatus:
    try:
        return CampaignStatus(value)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid campaign status.")


def _app_count_subquery():
    return (
        select(func.count(Application.id))
        .where(Application.campaign_id == Campaign.id)
        .correlate(Campaign)
        .scalar_subquery()
    )


@router.get("/campaigns")
async def admin_campaigns(
    search: Optional[str] = Query(None, max_length=100),
    status: str = Query("all"),
    range: str = Query("all", pattern="^(7d|30d|90d|all)$"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin),
):
    base = (
        db.query(Campaign)
        .join(User, User.id == Campaign.business_id)
        .outerjoin(BusinessProfile, BusinessProfile.user_id == User.id)
    )
    since = _since(range)
    if since is not None:
        base = base.filter(Campaign.created_at >= since)
    if search and search.strip():
        term = _like(search)
        base = base.filter(
            or_(
                Campaign.title.ilike(term, escape="\\"),
                BusinessProfile.company_name.ilike(term, escape="\\"),
                User.full_name.ilike(term, escape="\\"),
            )
        )

    # Per-status counts for the filter pills (respect search + date, not status).
    grouped = base.order_by(None).with_entities(Campaign.status, func.count(Campaign.id)).group_by(Campaign.status).all()
    counts = {s.value: 0 for s in CampaignStatus}
    for s, n in grouped:
        counts[s.value] = int(n)
    counts["all"] = sum(counts.values())

    q = base
    if status != "all":
        q = q.filter(Campaign.status == _parse_campaign_status(status))
    q = q.add_columns(BusinessProfile.company_name, User.full_name, User.role, _app_count_subquery().label("applications"))
    q = q.order_by(Campaign.created_at.desc(), Campaign.id.desc())

    rows, meta = _paginate(q, page, page_size)
    items = [
        {
            "id": c.id,
            "title": c.title,
            "business_id": c.business_id,
            "business": _business_name(company_name, full_name, owner_role),
            "is_platform_owned": owner_role == "admin",
            "status": c.status.value,
            "is_restricted": bool(c.is_restricted),
            "applications": int(applications or 0),
            "creators_needed": c.creators_needed,
            "created_at": c.created_at,
        }
        for c, company_name, full_name, owner_role, applications in rows
    ]
    return {"items": items, "counts": counts, **meta}


@router.get("/campaigns/{campaign_id}")
async def admin_campaign_detail(
    campaign_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin),
):
    campaign = db.query(Campaign).filter(Campaign.id == campaign_id).first()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found.")

    owner = campaign.business
    profile = owner.business_profile if owner else None

    rows = (
        db.query(Application, CreatorProfile.display_name, User.full_name)
        .join(User, User.id == Application.creator_id)
        .outerjoin(CreatorProfile, CreatorProfile.user_id == User.id)
        .filter(Application.campaign_id == campaign.id)
        .order_by(Application.created_at.desc())
        .limit(100)
        .all()
    )
    applications = [
        {
            "id": a.id,
            "creator_id": a.creator_id,
            "creator": display_name or full_name,
            "status": a.status,
            "rate": _money(a.agreed_rate if a.agreed_rate is not None else a.rate) if (a.agreed_rate is not None or a.rate is not None) else None,
            "applied_at": a.created_at,
        }
        for a, display_name, full_name in rows
    ]
    total_applications = int(db.query(func.count(Application.id)).filter(Application.campaign_id == campaign.id).scalar() or 0)

    def num(v):
        return float(v) if v is not None else None

    return {
        "id": campaign.id,
        "title": campaign.title,
        "business_id": campaign.business_id,
        "business": _business_name(profile.company_name if profile else None, owner.full_name if owner else None, owner.role if owner else None),
        "is_platform_owned": bool(owner and owner.role == "admin"),
        "creators_selected": int(db.query(func.count(Application.id)).filter(Application.campaign_id == campaign.id, Application.status == "accepted").scalar() or 0),
        "description": campaign.description,
        "responsibilities": campaign.responsibilities,
        "requirements": campaign.requirements,
        "category": campaign.category,
        "engagement_type": campaign.engagement_type,
        "duration": campaign.duration,
        "creator_types": campaign.creator_types or [],
        "required_skills": campaign.required_skills or [],
        "deliverables": campaign.deliverables or [],
        "location": campaign.location,
        "work_arrangement": campaign.work_arrangement,
        "hero_image": campaign.hero_image,
        "compensation_type": campaign.compensation_type,
        "budget": num(campaign.budget),
        "budget_min": num(campaign.budget_min),
        "budget_max": num(campaign.budget_max),
        "creators_needed": campaign.creators_needed,
        "status": campaign.status.value,
        "is_restricted": bool(campaign.is_restricted),
        "restricted_at": campaign.restricted_at,
        "restriction_reason_label": RESTRICTION_REASONS.get(campaign.restriction_reason) if campaign.restriction_reason else None,
        "application_deadline": campaign.application_deadline,
        "start_date": campaign.start_date,
        "end_date": campaign.end_date,
        "created_at": campaign.created_at,
        "total_applications": total_applications,
        "applications": applications,
        "selected_creators": [a for a in applications if a["status"] == "accepted"],
    }


@router.post("/campaigns/{campaign_id}/restrict")
async def restrict_campaign(
    campaign_id: int,
    body: RestrictRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin),
):
    """Close a campaign for moderation. Nothing is deleted: applications,
    contracts and payments stay linked to it."""
    _check_reason(body)
    campaign = db.query(Campaign).filter(Campaign.id == campaign_id).first()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found.")

    if not campaign.is_restricted:
        campaign.is_restricted = True
        campaign.restricted_at = _now()
        campaign.restriction_reason = body.reason
        campaign.restriction_note = (body.note or "").strip() or None
        resolve_complaints(db, current_user, body.complaint_ids, target_campaign_id=campaign.id)
        campaign.is_active = False
        # Completed/cancelled campaigns keep their real final status.
        if campaign.status in MOD_STATUSES:
            campaign.status = CampaignStatus.CLOSED
        create_notification(
            db,
            user_id=campaign.business_id,
            type="campaign_restricted",
            title="Campaign restricted",
            message=f'Your campaign "{campaign.title}" was closed by CreatorHub (reason: {RESTRICTION_REASONS[body.reason]}). Existing contracts and records are unchanged.',
            link=f"/campaigns/{campaign.id}",
            reference_id=campaign.id,
        )
        db.commit()
        owner = campaign.business
        if owner and owner.email:
            background_tasks.add_task(
                send_moderation_email,
                to_email=owner.email,
                name=owner.full_name,
                subject=f"Your {BRAND} campaign was closed",
                headline="Campaign closed by CreatorHub",
                paragraphs=[
                    f'Your campaign "{campaign.title}" has been restricted and closed by our team. Reason: {RESTRICTION_REASONS[body.reason]}.',
                    "It no longer accepts applications. Existing applications, contracts and payments are unchanged.",
                    "If you think this is a mistake, please contact CreatorHub support.",
                ],
            )
    return {"id": campaign.id, "status": campaign.status.value, "is_restricted": True}


@router.post("/campaigns/{campaign_id}/applications/{application_id}/select")
async def select_creator_for_platform_campaign(
    campaign_id: int,
    application_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin),
):
    """Select a creator for a campaign CreatorHub runs itself.

    Normal brands pay a platform fee before a contract goes live. CreatorHub
    does not pay itself, so here the contract is activated immediately with a
    zero fee and no Payment row (it never counts as revenue).
    """
    campaign = db.query(Campaign).filter(Campaign.id == campaign_id).first()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found.")
    if not campaign.business or campaign.business.role != "admin":
        raise HTTPException(status_code=400, detail="Only CreatorHub-owned campaigns can be managed here. Brands select their own creators.")
    if campaign.is_restricted:
        raise HTTPException(status_code=400, detail="This campaign is restricted.")

    application = db.query(Application).filter(Application.id == application_id, Application.campaign_id == campaign.id).first()
    if not application:
        raise HTTPException(status_code=404, detail="Application not found.")
    if application.status != "pending":
        raise HTTPException(status_code=400, detail="This application is no longer pending.")
    if application.creator and application.creator.is_restricted:
        raise HTTPException(status_code=400, detail="This creator's account is currently restricted and cannot be selected.")
    if db.query(Contract).filter(Contract.application_id == application.id).first():
        raise HTTPException(status_code=400, detail="A contract already exists for this application.")

    selected = int(db.query(func.count(Application.id)).filter(Application.campaign_id == campaign.id, Application.status == "accepted").scalar() or 0)
    if selected >= int(campaign.creators_needed or 1):
        raise HTTPException(status_code=400, detail="This campaign has already selected the required number of creators.")

    rate, _ = candidate_rate_and_status(application, campaign)
    if rate is None:
        raise HTTPException(status_code=400, detail="This application has no agreed rate. Use a fixed-amount campaign or ask the creator to propose a rate.")
    total = total_for_rate(rate, campaign)
    now = _now()

    contract = Contract(
        campaign_id=campaign.id, application_id=application.id, business_id=campaign.business_id, creator_id=application.creator_id,
        engagement_type=campaign.engagement_type, duration=campaign.duration, pricing_model=campaign.pricing_model,
        compensation_type=campaign.compensation_type, compensation_description=campaign.compensation_description,
        agreed_rate=rate, total_value=total, platform_fee_rate=0, platform_fee_amount=0,
        start_date=campaign.start_date, end_date=campaign.end_date, status="active",
        payment_method="none", fee_paid_at=now,
        evidence_snapshot=build_evidence_snapshot(campaign, application, rate),
    )
    db.add(contract)

    application.status = "accepted"
    application.agreed_rate = rate
    application.rate = rate
    application.rate_locked = 1

    create_notification(
        db, user_id=application.creator_id, type="creator_selected",
        title="You were selected! 🎉",
        message=f"🎉 You have been selected by CreatorHub for the campaign: {campaign.title}. Open the campaign to continue.",
        link=f"/campaigns/{campaign.id}", reference_id=application.id,
        event_key=f"creator-selected:{application.id}",
    )

    if selected + 1 >= int(campaign.creators_needed or 1):
        campaign.status = CampaignStatus.CLOSED
        campaign.is_active = False
        for other in db.query(Application).filter(
            Application.campaign_id == campaign.id, Application.id != application.id,
            Application.status.in_(["pending", "payment_pending"]),
        ).all():
            other.status = "rejected"
            create_notification(
                db, user_id=other.creator_id, type="application_rejected", title="Campaign closed",
                message=f"The creator for {campaign.title} has been selected. Your application was not selected.",
                link="/applications", reference_id=other.id, event_key=f"application-rejected-closed:{other.id}",
            )
    db.commit()
    return {"application_id": application.id, "contract_id": contract.id, "campaign_status": campaign.status.value}


# ------------------------------------------------------------------
# REVENUE
# ------------------------------------------------------------------

@router.get("/revenue")
async def admin_revenue(
    range: str = Query("30d", pattern="^(7d|30d|90d|year|all)$"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin),
):
    since = _since(range)
    month_start = _now().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    year_start = _since("year")

    biz = aliased(User)
    q = (
        db.query(
            Payment.id,
            FEE_TS.label("at"),
            Payment.payment_type,
            Payment.amount,
            Payment.status,
            Campaign.id.label("campaign_id"),
            Campaign.title,
            BusinessProfile.company_name,
            biz.full_name,
            biz.role.label("owner_role"),
            func.coalesce(Contract.total_value, Application.agreed_rate).label("contract_value"),
        )
        .outerjoin(Campaign, Campaign.id == Payment.campaign_id)
        .outerjoin(biz, biz.id == Campaign.business_id)
        .outerjoin(BusinessProfile, BusinessProfile.user_id == biz.id)
        .outerjoin(Contract, Contract.application_id == Payment.application_id)
        .outerjoin(Application, Application.id == Payment.application_id)
        .filter(*_paid_fee_filters())
    )
    if since is not None:
        q = q.filter(FEE_TS >= since)
    q = q.order_by(FEE_TS.desc(), Payment.id.desc())

    rows, meta = _paginate(q, page, page_size)
    # Intentionally excludes provider ids (pidx, transaction_id) and checkout details.
    transactions = [
        {
            "id": r.id,
            "date": r.at,
            "campaign_id": r.campaign_id,
            "campaign": r.title,
            "business": _business_name(r.company_name, r.full_name, r.owner_role),
            "contract_value": _money(r.contract_value) if r.contract_value is not None else None,
            "platform_fee": _money(r.amount),
            "status": "paid",
        }
        for r in rows
    ]

    # Breakdown by what CreatorHub actually recorded. creator_payout is always 0
    # (creator money is not processed here), so there is no payout slice to chart.
    breakdown_rows = (
        db.query(Payment.payment_type, func.count(Payment.id), func.coalesce(func.sum(Payment.amount), 0))
        .filter(*_paid_fee_filters(), *([FEE_TS >= since] if since is not None else []))
        .group_by(Payment.payment_type)
        .all()
    )
    labels = {"platform_fee": "Platform service fees", "selection_fee": "Legacy selection fees"}
    breakdown = [
        {"type": t, "label": labels.get(t, t), "count": int(n), "amount": _money(total)}
        for t, n, total in sorted(breakdown_rows, key=lambda r: r[0] != "platform_fee")
    ]

    return {
        "range": range,
        "summary": {
            "total_revenue": _revenue_total(db),
            "revenue_this_month": _revenue_total(db, month_start),
            "revenue_this_year": _revenue_total(db, year_start),
            "paid_contracts": _revenue_count(db),
            "range_revenue": _revenue_total(db, since),
            "range_paid_contracts": _revenue_count(db, since),
        },
        "chart": _bucket_revenue(db, since),
        "breakdown": breakdown,
        "transactions": transactions,
        **meta,
    }