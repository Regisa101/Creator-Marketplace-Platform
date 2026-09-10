from __future__ import annotations

from datetime import datetime, timezone
from typing import Optional

from sqlalchemy.orm import Session

from app.models import Notification


def create_notification(
    db: Session,
    *,
    user_id: int,
    type: str,
    title: str,
    message: str,
    link: Optional[str] = None,
    reference_id: Optional[int] = None,
    event_key: Optional[str] = None,
) -> Notification:
    """Create one in-app notification, safely de-duplicated by event_key."""
    if event_key:
        existing = db.query(Notification).filter(Notification.event_key == event_key).first()
        if existing:
            return existing

    item = Notification(
        user_id=user_id,
        type=type,
        title=title,
        message=message,
        link=link,
        reference_id=reference_id,
        event_key=event_key,
        is_read=False,
        created_at=datetime.now(timezone.utc),
    )
    db.add(item)
    return item