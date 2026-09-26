from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.models import Campaign, Application
from app.models.campaign import CampaignStatus
from app.services.notifications import create_notification


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _aware(value: datetime) -> datetime:
    """Normalize a possibly-naive DB timestamp to UTC-aware."""
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value


def accepted_creator_count(db: Session, campaign_id: int) -> int:
    """
    Number of creators already selected/working on a campaign.

    "selected" is a transient in-flight status (see
    applications.select_application), so only "accepted" and
    "completed" applications count as a filled slot.
    """
    return (
        db.query(Application)
        .filter(
            Application.campaign_id == campaign_id,
            Application.status.in_(["accepted", "completed"]),
        )
        .count()
    )


def check_expired_campaign_deadlines(db: Session, business_id: int) -> None:
    """
    Look at this business's published campaigns and, for any whose
    application deadline has passed without a single creator selected,
    create an in-app notification asking whether to extend the deadline
    or delete the campaign.

    Safe to call on every request that loads a business's campaigns or
    notifications: notifications are de-duplicated by event_key, so a
    campaign that has already been flagged for its current deadline is
    never notified twice. If the business extends the deadline and it
    later passes again unattended, a fresh notification is created
    because the event_key includes the deadline value.
    """

    now = _utcnow()

    campaigns = (
        db.query(Campaign)
        .filter(
            Campaign.business_id == business_id,
            Campaign.status == CampaignStatus.PUBLISHED,
            Campaign.is_active.is_(True),
            Campaign.application_deadline.isnot(None),
        )
        .all()
    )

    if not campaigns:
        return

    created = False

    try:
        for campaign in campaigns:
            deadline = _aware(campaign.application_deadline)

            if deadline >= now:
                continue

            if accepted_creator_count(db, campaign.id) > 0:
                # A creator was already selected — nothing to flag.
                continue

            create_notification(
                db,
                user_id=business_id,
                type="campaign_deadline_expired",
                title="Application deadline passed",
                message=(
                    f'"{campaign.title}" has passed its application '
                    "deadline with no creator selected. Extend the "
                    "deadline or delete the campaign."
                ),
                link=f"/campaigns/{campaign.id}?source=dashboard",
                reference_id=campaign.id,
                event_key=(
                    f"campaign-deadline-expired:{campaign.id}:"
                    f"{deadline.isoformat()}"
                ),
            )
            created = True

        if created:
            db.commit()

    except Exception:
        db.rollback()
        raise