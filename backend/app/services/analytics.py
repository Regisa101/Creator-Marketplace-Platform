"""Brand analytics, calculated ONLY from data CreatorHub already stores.

Nothing here is estimated, sampled or seeded: every number is an aggregate over
the campaigns / applications / contracts that belong to the logged-in brand.

How the existing data maps to the analytics (see models/*.py):

  Application.status   pending -> accepted -> completed   (or rejected / withdrawn)
  Contract.status      draft -> pending_payment -> active -> completed | cancelled
  Contract.fee_paid_at set when the brand's Khalti payment is verified. That same
                       step flips the contract to "active" and the application
                       to "accepted", so a creator is *officially hired* the
                       moment the platform fee is paid.

Funnel stages (cohort = applications received inside the selected range):
  applications  every application received
  selected      the brand picked the creator -> a (non-cancelled) contract exists
  paid          the contract's platform fee has been paid (creator is hired)
  completed     the contract was marked completed

Date range rules:
  * Applications, Creators Hired, funnel, completion rate, applications per
    campaign  ->  by Application.created_at
  * Spend  ->  by the payment date (Contract.fee_paid_at)
  * Campaign fill progress and "Needs your attention" are always the current
    state and are not affected by the range.

Total Spent = for every paid contract: the agreed creator value (total_value)
plus the CreatorHub platform fee on top of it (platform_fee_amount).
"""
from __future__ import annotations

from datetime import date, datetime, timedelta, timezone
from typing import Any

from sqlalchemy import case, func
from sqlalchemy.orm import Session

from app.models import Application, Campaign, Contract
from app.models.campaign import CampaignStatus

RANGE_DAYS: dict[str, int | None] = {"7d": 7, "30d": 30, "90d": 90, "all": None}

PENDING_ALERT_DAYS = 3      # an unreviewed application older than this needs attention
DEADLINE_ALERT_DAYS = 7     # campaign deadlines closer than this need attention
ATTENTION_ITEM_LIMIT = 5
CAMPAIGN_ROW_LIMIT = 300

SELECTED_STATUSES = ("draft", "pending_payment", "active", "completed")
PAID_STATUSES = ("active", "completed")
UNPAID_STATUSES = ("draft", "pending_payment")


# --------------------------------------------------------------------------
# Small pure helpers (no database access)
# --------------------------------------------------------------------------
def to_utc(value: datetime | None) -> datetime | None:
    if value is None:
        return None
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


def range_start(range_key: str, now: datetime) -> datetime | None:
    """Midnight (UTC) of the first day of the range. "Last 7 days" = today + 6 days before."""
    days = RANGE_DAYS[range_key]
    if days is None:
        return None
    first_day = (now - timedelta(days=days - 1)).date()
    return datetime(first_day.year, first_day.month, first_day.day, tzinfo=timezone.utc)


def month_keys(first: date, last: date) -> list[str]:
    keys: list[str] = []
    year, month = first.year, first.month
    while (year, month) <= (last.year, last.month):
        keys.append(f"{year:04d}-{month:02d}")
        month += 1
        if month == 13:
            year, month = year + 1, 1
    return keys


def day_keys(first: date, last: date) -> list[str]:
    return [(first + timedelta(days=i)).isoformat() for i in range((last - first).days + 1)]


def percent(part: int, whole: int) -> int | None:
    """Whole-number percentage, or None when there is nothing to compare against."""
    if not whole:
        return None
    return int(round(part * 100 / whole))


def build_spend_points(
    payments: list[tuple[datetime, float]],
    start: datetime | None,
    now: datetime,
    granularity: str,
) -> list[dict[str, Any]]:
    """Group (paid_at, amount) pairs into day or month buckets, including empty buckets."""
    totals: dict[str, float] = {}
    for paid_at, amount in payments:
        key = paid_at.date().isoformat() if granularity == "day" else f"{paid_at.year:04d}-{paid_at.month:02d}"
        totals[key] = totals.get(key, 0.0) + amount

    today = now.date()
    if granularity == "day":
        keys = day_keys(start.date() if start else today, today)
    else:
        if start is not None:
            first = start.date()
        elif payments:
            first = min(paid_at for paid_at, _ in payments).date()
        else:
            return []
        keys = month_keys(first, today)

    return [{"period": key, "amount": round(totals.get(key, 0.0), 2)} for key in keys]


def _iso(value: datetime | None) -> str | None:
    value = to_utc(value)
    return value.isoformat() if value else None


def _status_value(status: Any) -> str:
    return str(getattr(status, "value", status))


def _money(value: Any) -> float:
    return float(value) if value is not None else 0.0


# --------------------------------------------------------------------------
# Main entry point
# --------------------------------------------------------------------------
def build_business_analytics(
    db: Session,
    business_id: int,
    range_key: str,
    now: datetime | None = None,
) -> dict[str, Any]:
    now = now or datetime.now(timezone.utc)
    start = range_start(range_key, now)

    paid_contract = (
        Contract.business_id == business_id,
        Contract.fee_paid_at.isnot(None),
        Contract.status.in_(PAID_STATUSES),
    )

    # ---- This brand's campaigns (drafts never receive applications) -------
    campaign_rows = (
        db.query(Campaign.id, Campaign.title, Campaign.status, Campaign.creators_needed)
        .filter(Campaign.business_id == business_id, Campaign.status != CampaignStatus.DRAFT)
        .order_by(Campaign.created_at.desc())
        .limit(CAMPAIGN_ROW_LIMIT)
        .all()
    )

    # ---- Applications received in the range, per campaign -----------------
    application_filters = [Campaign.business_id == business_id]
    if start is not None:
        application_filters.append(Application.created_at >= start)

    applications_by_campaign = dict(
        db.query(Application.campaign_id, func.count(Application.id))
        .join(Campaign, Campaign.id == Application.campaign_id)
        .filter(*application_filters)
        .group_by(Application.campaign_id)
        .all()
    )

    # ---- Hiring funnel (cohort = applications received in the range) ------
    selected_cond = Contract.status.in_(SELECTED_STATUSES)
    paid_cond = (Contract.fee_paid_at.isnot(None)) & (Contract.status.in_(PAID_STATUSES))
    completed_cond = Contract.status == "completed"

    funnel_row = (
        db.query(
            func.count(Application.id),
            func.coalesce(func.sum(case((selected_cond, 1), else_=0)), 0),
            func.coalesce(func.sum(case((paid_cond, 1), else_=0)), 0),
            func.coalesce(func.sum(case((completed_cond, 1), else_=0)), 0),
        )
        .select_from(Application)
        .join(Campaign, Campaign.id == Application.campaign_id)
        .outerjoin(Contract, Contract.application_id == Application.id)
        .filter(*application_filters)
        .one()
    )
    applications_total, selected_total, paid_total, completed_total = (int(v or 0) for v in funnel_row)

    # ---- Creators hired per campaign (all time, for fill progress) --------
    hired_by_campaign = dict(
        db.query(Contract.campaign_id, func.count(Contract.id))
        .filter(*paid_contract)
        .group_by(Contract.campaign_id)
        .all()
    )

    # ---- Spend (by payment date) -----------------------------------------
    spend_query = db.query(
        Contract.fee_paid_at, Contract.total_value, Contract.platform_fee_amount
    ).filter(*paid_contract)
    if start is not None:
        spend_query = spend_query.filter(Contract.fee_paid_at >= start)

    payments: list[tuple[datetime, float]] = []
    total_spent = 0.0
    platform_fees = 0.0
    for paid_at, total_value, fee_amount in spend_query.all():
        amount = _money(total_value) + _money(fee_amount)
        payments.append((to_utc(paid_at), amount))
        total_spent += amount
        platform_fees += _money(fee_amount)

    granularity = "day" if range_key in ("7d", "30d") else "month"

    # ---- Needs your attention (current state, not range-filtered) ---------
    pending_cutoff = now - timedelta(days=PENDING_ALERT_DAYS)
    pending_count, oldest_pending = (
        db.query(func.count(Application.id), func.min(Application.created_at))
        .select_from(Application)
        .join(Campaign, Campaign.id == Application.campaign_id)
        .outerjoin(Contract, Contract.application_id == Application.id)
        .filter(
            Campaign.business_id == business_id,
            Campaign.status.in_([CampaignStatus.PUBLISHED, CampaignStatus.IN_PROGRESS]),
            Application.status == "pending",
            Application.created_at <= pending_cutoff,
            Contract.id.is_(None),  # no contract yet = the brand has not acted on it
        )
        .one()
    )
    pending_count = int(pending_count or 0)
    oldest_pending = to_utc(oldest_pending)

    unpaid_query = (
        db.query(Contract)
        .join(Application, Application.id == Contract.application_id)
        .filter(
            Contract.business_id == business_id,
            Contract.status.in_(UNPAID_STATUSES),
            Application.status == "pending",
        )
    )
    unpaid_count = unpaid_query.count()
    unpaid_items = []
    for contract in unpaid_query.order_by(Contract.created_at.asc()).limit(ATTENTION_ITEM_LIMIT).all():
        unpaid_items.append(
            {
                "contract_id": contract.id,
                "campaign_id": contract.campaign_id,
                "campaign_title": contract.campaign.title if contract.campaign else None,
                "creator_name": contract.application.creator_name if contract.application else None,
                "status": contract.status,
                "fee_amount": _money(contract.platform_fee_amount) if contract.platform_fee_amount is not None else None,
                # pending_payment contracts have a checkout on the contract page;
                # drafts still need their terms finalized from the applications inbox.
                "link": (
                    f"/contracts/{contract.id}"
                    if contract.status == "pending_payment"
                    else f"/applications?campaign={contract.campaign_id}"
                ),
            }
        )

    closing_rows = (
        db.query(Campaign.id, Campaign.title, Campaign.application_deadline)
        .filter(
            Campaign.business_id == business_id,
            Campaign.status == CampaignStatus.PUBLISHED,
            Campaign.is_active.is_(True),
            Campaign.application_deadline.isnot(None),
            Campaign.application_deadline > now,
            Campaign.application_deadline <= now + timedelta(days=DEADLINE_ALERT_DAYS),
        )
        .order_by(Campaign.application_deadline.asc())
        .limit(ATTENTION_ITEM_LIMIT)
        .all()
    )

    attention_groups = int(pending_count > 0) + int(unpaid_count > 0) + int(len(closing_rows) > 0)

    return {
        "range": range_key,
        "range_start": _iso(start),
        "generated_at": _iso(now),
        "has_campaigns": len(campaign_rows) > 0,
        "summary": {
            "total_applications": applications_total,
            "creators_hired": paid_total,
            "total_spent": round(total_spent, 2),
            "platform_fees": round(platform_fees, 2),
            "completion_rate": percent(completed_total, paid_total) or 0,
        },
        "funnel": {
            "applications": applications_total,
            "selected": selected_total,
            "paid": paid_total,
            "completed": completed_total,
            "selected_pct": percent(selected_total, applications_total),
            "paid_pct": percent(paid_total, selected_total),
            "completed_pct": percent(completed_total, paid_total),
        },
        "spend_over_time": {
            "granularity": granularity,
            "points": build_spend_points(payments, start, now, granularity),
        },
        "campaigns": [
            {
                "id": row.id,
                "title": row.title,
                "status": _status_value(row.status),
                "creators_needed": int(row.creators_needed or 1),
                "applications": int(applications_by_campaign.get(row.id, 0)),
                "hired": int(hired_by_campaign.get(row.id, 0)),
            }
            for row in campaign_rows
        ],
        "attention": {
            "count": attention_groups,
            "pending_applications": {
                "count": pending_count,
                "older_than_days": PENDING_ALERT_DAYS,
                "oldest_days": (now - oldest_pending).days if oldest_pending else None,
                "link": "/applications",
            },
            "unpaid_selected": {"count": unpaid_count, "items": unpaid_items},
            "closing_soon": {
                "items": [
                    {
                        "campaign_id": row.id,
                        "title": row.title,
                        "deadline": _iso(row.application_deadline),
                        "link": f"/campaigns/{row.id}",
                    }
                    for row in closing_rows
                ]
            },
        },
    }