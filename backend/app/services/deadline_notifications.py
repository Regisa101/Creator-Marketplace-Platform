from __future__ import annotations

from datetime import datetime, timedelta, timezone

from app.database import SessionLocal
from app.models import Application, Campaign, Notification
from app.services.notifications import create_notification


def check_deadline_notifications() -> int:
    """Create once-per-day deadline reminders for active collaborations."""
    db = SessionLocal()
    created = 0
    try:
        now = datetime.now(timezone.utc)
        today = now.date()
        tomorrow = today + timedelta(days=1)

        applications = db.query(Application).filter(Application.status == "accepted").all()
        for application in applications:
            campaign = db.query(Campaign).filter(Campaign.id == application.campaign_id).first()
            if not campaign:
                continue

            deadline = application.deliverable_deadline or campaign.deliverable_deadline
            if not deadline:
                continue
            if deadline.tzinfo is None:
                deadline = deadline.replace(tzinfo=timezone.utc)

            due_date = deadline.astimezone(timezone.utc).date()
            link = f"/workspace/deliverables?collab={application.id}"

            if due_date == tomorrow:
                event_key = f"deadline-tomorrow:{application.id}:{tomorrow.isoformat()}"
                if not db.query(Notification).filter(Notification.event_key == event_key).first():
                    create_notification(
                        db,
                        user_id=application.creator_id,
                        type="deadline_tomorrow",
                        title="Your deadline is tomorrow",
                        message=f"Your deliverables for {campaign.title} are due tomorrow.",
                        link=link,
                        reference_id=application.id,
                        event_key=event_key,
                    )
                    created += 1
            elif due_date == today:
                event_key = f"deadline-today:{application.id}:{today.isoformat()}"
                if not db.query(Notification).filter(Notification.event_key == event_key).first():
                    create_notification(
                        db,
                        user_id=application.creator_id,
                        type="deadline_today",
                        title="Your deadline is today",
                        message=f"Your deliverables for {campaign.title} are due today.",
                        link=link,
                        reference_id=application.id,
                        event_key=event_key,
                    )
                    created += 1
            elif due_date < today:
                event_key = f"deadline-overdue:{application.id}:{today.isoformat()}"
                if not db.query(Notification).filter(Notification.event_key == event_key).first():
                    create_notification(
                        db,
                        user_id=application.creator_id,
                        type="deadline_overdue",
                        title="Your deadline has passed",
                        message=f"The deliverable deadline for {campaign.title} has passed.",
                        link=link,
                        reference_id=application.id,
                        event_key=event_key,
                    )
                    created += 1

        db.commit()
        return created
    finally:
        db.close()
