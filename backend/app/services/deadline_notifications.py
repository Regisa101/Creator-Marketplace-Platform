from __future__ import annotations

from datetime import datetime, timedelta, timezone

from sqlalchemy.orm import Session

from app.database import SessionLocal
from app.models.application import Application
from app.models.calendar_event import CalendarEvent
from app.models.deliverable import Deliverable
from app.models.notification import Notification
from app.models.publication_proof import PublicationProof


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _create_notification(
    db: Session,
    *,
    user_id: int,
    title: str,
    message: str,
    event_key: str | None = None,
) -> None:
    """
    Create a notification only if an identical event has not
    already been created.
    """

    if event_key:
        existing = (
            db.query(Notification)
            .filter(Notification.event_key == event_key)
            .first()
        )

        if existing:
            return

    notification = Notification(
        user_id=user_id,
        title=title,
        message=message,
        event_key=event_key,
        is_read=False,
    )

    db.add(notification)


def check_deadline_notifications() -> None:
    """
    Check upcoming/overdue collaboration deadlines and create
    notifications for creators and brands.

    This function intentionally does NOT define CalendarEvent.
    CalendarEvent already belongs to app.models.calendar_event.
    """

    db = SessionLocal()

    try:
        now = _utcnow()
        tomorrow = now + timedelta(days=1)

        # ====================================================
        # DELIVERABLE DEADLINES
        # ====================================================

        deliverables = (
            db.query(Deliverable)
            .filter(
                Deliverable.due_date.isnot(None),
                Deliverable.status.notin_(
                    ["approved", "completed"]
                ),
            )
            .all()
        )

        for deliverable in deliverables:
            if not deliverable.due_date:
                continue

            due = deliverable.due_date

            # Normalize naive DB timestamps.
            if due.tzinfo is None:
                due = due.replace(tzinfo=timezone.utc)

            application = (
                db.query(Application)
                .filter(
                    Application.id == deliverable.application_id
                )
                .first()
            )

            if not application:
                continue

            # ------------------------------------------------
            # Overdue
            # ------------------------------------------------
            if due < now:
                _create_notification(
                    db,
                    user_id=application.creator_id,
                    title="Deliverable overdue",
                    message=(
                        f'"{deliverable.title}" is overdue. '
                        "Please submit it as soon as possible."
                    ),
                    event_key=f"deliverable-overdue-{deliverable.id}",
                )

            # ------------------------------------------------
            # Due today
            # ------------------------------------------------
            elif due.date() == now.date():
                _create_notification(
                    db,
                    user_id=application.creator_id,
                    title="Deliverable due today",
                    message=(
                        f'"{deliverable.title}" is due today.'
                    ),
                    event_key=f"deliverable-today-{deliverable.id}",
                )

            # ------------------------------------------------
            # Due tomorrow
            # ------------------------------------------------
            elif due.date() == tomorrow.date():
                _create_notification(
                    db,
                    user_id=application.creator_id,
                    title="Deliverable due tomorrow",
                    message=(
                        f'"{deliverable.title}" is due tomorrow.'
                    ),
                    event_key=f"deliverable-tomorrow-{deliverable.id}",
                )

        # ====================================================
        # REVIEW DEADLINES
        # ====================================================

        submitted = (
            db.query(Deliverable)
            .filter(
                Deliverable.status == "submitted",
                Deliverable.submitted_at.isnot(None),
            )
            .all()
        )

        for deliverable in submitted:
            if not deliverable.submitted_at:
                continue

            submitted_at = deliverable.submitted_at

            if submitted_at.tzinfo is None:
                submitted_at = submitted_at.replace(
                    tzinfo=timezone.utc
                )

            review_deadline = submitted_at + timedelta(hours=48)

            application = (
                db.query(Application)
                .filter(
                    Application.id == deliverable.application_id
                )
                .first()
            )

            if not application:
                continue

            if review_deadline < now:
                _create_notification(
                    db,
                    user_id=application.campaign.business_id,
                    title="Deliverable review overdue",
                    message=(
                        f'Please review "{deliverable.title}". '
                        "The 48-hour review period has passed."
                    ),
                    event_key=f"review-overdue-{deliverable.id}",
                )

            elif review_deadline.date() == now.date():
                _create_notification(
                    db,
                    user_id=application.campaign.business_id,
                    title="Deliverable review due today",
                    message=(
                        f'Please review "{deliverable.title}" today.'
                    ),
                    event_key=f"review-today-{deliverable.id}",
                )

            elif review_deadline.date() == tomorrow.date():
                _create_notification(
                    db,
                    user_id=application.campaign.business_id,
                    title="Deliverable review due tomorrow",
                    message=(
                        f'Please review "{deliverable.title}" tomorrow.'
                    ),
                    event_key=f"review-tomorrow-{deliverable.id}",
                )

        # ====================================================
        # PUBLICATION DEADLINES
        # ====================================================

        applications = (
            db.query(Application)
            .all()
        )

        for application in applications:
            campaign = application.campaign

            if not campaign:
                continue

            if campaign.completion_mode != "publication_required":
                continue

            if not campaign.publication_deadline:
                continue

            deadline = campaign.publication_deadline

            if deadline.tzinfo is None:
                deadline = deadline.replace(
                    tzinfo=timezone.utc
                )

            # Creator publication reminder.
            if deadline < now:
                _create_notification(
                    db,
                    user_id=application.creator_id,
                    title="Publication deadline overdue",
                    message=(
                        f'"{campaign.title}" has passed its '
                        "publication deadline."
                    ),
                    event_key=f"publication-overdue-{application.id}",
                )

            elif deadline.date() == now.date():
                _create_notification(
                    db,
                    user_id=application.creator_id,
                    title="Publish today",
                    message=(
                        f'"{campaign.title}" must be published today.'
                    ),
                    event_key=f"publication-today-{application.id}",
                )

            elif deadline.date() == tomorrow.date():
                _create_notification(
                    db,
                    user_id=application.creator_id,
                    title="Publish tomorrow",
                    message=(
                        f'"{campaign.title}" must be published tomorrow.'
                    ),
                    event_key=f"publication-tomorrow-{application.id}",
                )

        # ====================================================
        # PUBLICATION PROOF VERIFICATION
        # ====================================================

        proofs = (
            db.query(PublicationProof)
            .filter(
                PublicationProof.status == "pending"
            )
            .all()
        )

        for proof in proofs:
            submitted_at = proof.submitted_at

            if not submitted_at:
                continue

            if submitted_at.tzinfo is None:
                submitted_at = submitted_at.replace(
                    tzinfo=timezone.utc
                )

            verification_deadline = (
                submitted_at + timedelta(hours=24)
            )

            application = (
                db.query(Application)
                .filter(
                    Application.id == proof.application_id
                )
                .first()
            )

            if not application:
                continue

            business_id = application.campaign.business_id

            if verification_deadline < now:
                _create_notification(
                    db,
                    user_id=business_id,
                    title="Publication verification overdue",
                    message=(
                        "A creator's publication proof is waiting "
                        "for verification."
                    ),
                    event_key=f"proof-overdue-{proof.id}",
                )

            elif verification_deadline.date() == now.date():
                _create_notification(
                    db,
                    user_id=business_id,
                    title="Verify publication",
                    message=(
                        "A publication proof needs to be verified today."
                    ),
                    event_key=f"proof-today-{proof.id}",
                )

            elif verification_deadline.date() == tomorrow.date():
                _create_notification(
                    db,
                    user_id=business_id,
                    title="Publication proof due tomorrow",
                    message=(
                        "A publication proof should be verified tomorrow."
                    ),
                    event_key=f"proof-tomorrow-{proof.id}",
                )

        db.commit()

    except Exception:
        db.rollback()
        raise

    finally:
        db.close()