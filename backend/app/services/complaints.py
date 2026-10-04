"""Shared constants and helpers for complaints and restriction reasons."""
from __future__ import annotations

# Why an admin can restrict an account or campaign. Shown in the restrict
# dialog, saved on the user/campaign, and included in the notification/email.
RESTRICTION_REASONS: dict[str, str] = {
    "fake_profile": "Fake or impersonated profile",
    "plagiarism": "Plagiarised or copyrighted content",
    "no_delivery": "Not delivering agreed work",
    "non_payment": "Not paying the agreed compensation",
    "scam": "Scam or misleading campaign",
    "harassment": "Harassment or abuse",
    "spam": "Spam or mass applications",
    "off_platform": "Avoiding the platform fee / off-platform deals",
    "prohibited_content": "Prohibited content or products",
    "duplicate_account": "Duplicate account or evading a restriction",
    "security": "Security (compromised account)",
    "legal": "Legal or payment-provider request",
    "other": "Other",
}

# What a creator may report about a business, and what a business may report
# about a creator.
CREATOR_REPORTS_BUSINESS = ("non_payment", "scam", "harassment", "off_platform", "fake_profile", "other")
BUSINESS_REPORTS_CREATOR = ("no_delivery", "plagiarism", "harassment", "spam", "off_platform", "fake_profile", "other")

CAMPAIGN_CATEGORIES = ("scam", "prohibited_content", "plagiarism", "other")

PLATFORM_CATEGORIES: dict[str, str] = {
    "platform_bug": "Something is not working",
    "payment_issue": "Payment or fee problem",
    "unfair_restriction": "My account or campaign was restricted unfairly",
    "other": "Other",
}

COMPLAINT_STATUSES = ("new", "under_review", "upheld", "dismissed")
OPEN_STATUSES = ("new", "under_review")

# Categories that can be reported without having worked with the person.
NO_INTERACTION_NEEDED = ("fake_profile", "scam", "prohibited_content")

MAX_COMPLAINTS_PER_DAY = 5


def category_label(category: str) -> str:
    return RESTRICTION_REASONS.get(category) or PLATFORM_CATEGORIES.get(category) or category.replace("_", " ").capitalize()


# A user with this many different reporters is flagged for a closer look.
REPEAT_THRESHOLD = 3


# ----------------------------------------------------------------------
# database helpers (imports kept local so the constants above stay light)
# ----------------------------------------------------------------------

def complaint_counts_for_users(db, user_ids: list[int]) -> dict[int, int]:
    """Unique reporters per user, ignoring dismissed complaints."""
    from sqlalchemy import func

    from app.models import Complaint

    if not user_ids:
        return {}
    rows = (
        db.query(Complaint.target_user_id, func.count(func.distinct(Complaint.reporter_id)))
        .filter(Complaint.target_user_id.in_(user_ids), Complaint.status != "dismissed")
        .group_by(Complaint.target_user_id)
        .all()
    )
    return {uid: int(n) for uid, n in rows}


def user_complaint_stats(db, user_id: int) -> dict:
    """Summary used on admin detail views and complaint rows."""
    from app.models import Complaint

    rows = (
        db.query(Complaint.reporter_id, Complaint.category, Complaint.status)
        .filter(Complaint.target_user_id == user_id, Complaint.status != "dismissed")
        .all()
    )
    reporters = {r[0] for r in rows}
    by_category: dict[str, set] = {}
    for reporter_id, category, _status in rows:
        by_category.setdefault(category, set()).add(reporter_id)
    top_category, top_reporters = (None, 0)
    if by_category:
        top_category, who = max(by_category.items(), key=lambda kv: len(kv[1]))
        top_reporters = len(who)
    return {
        "total": len(rows),
        "unique_reporters": len(reporters),
        "open": sum(1 for r in rows if r[2] in OPEN_STATUSES),
        "top_category": top_category,
        "top_category_label": category_label(top_category) if top_category else None,
        "top_category_reporters": top_reporters,
        "flagged": len(reporters) >= REPEAT_THRESHOLD or top_reporters >= 2,
    }


def resolve_complaints(db, admin, complaint_ids: list[int], *, target_user_id=None, target_campaign_id=None) -> int:
    """Mark open complaints as upheld after the admin acted on them.

    Only complaints that really are about the restricted user/campaign are touched.
    """
    from datetime import datetime, timezone

    from app.models import Complaint
    from app.services.notifications import create_notification

    if not complaint_ids:
        return 0
    q = db.query(Complaint).filter(Complaint.id.in_(complaint_ids), Complaint.status.in_(OPEN_STATUSES))
    if target_campaign_id is not None:
        q = q.filter(Complaint.target_campaign_id == target_campaign_id)
    else:
        q = q.filter(Complaint.target_user_id == target_user_id)
    changed = 0
    for c in q.all():
        c.status = "upheld"
        c.reviewed_by = admin.id
        c.reviewed_at = datetime.now(timezone.utc)
        create_notification(
            db,
            user_id=c.reporter_id,
            type="complaint_resolved",
            title="We acted on your complaint",
            message="Thank you for reporting this. We reviewed your complaint and took action.",
            link="/complaints",
            reference_id=c.id,
            event_key=f"complaint_{c.id}_upheld",
        )
        changed += 1
    return changed