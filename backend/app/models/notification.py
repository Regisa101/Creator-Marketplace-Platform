from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime, ForeignKey, Index
from sqlalchemy.sql import func
from app.database import Base


class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    type = Column(String(60), nullable=False, default="general")
    title = Column(String(180), nullable=False)
    message = Column(Text, nullable=False)
    link = Column(String(255), nullable=True)
    reference_id = Column(Integer, nullable=True)
    event_key = Column(String(255), nullable=True, index=True)
    is_read = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    __table_args__ = (
        Index("ix_notifications_user_created", "user_id", "created_at"),
    )