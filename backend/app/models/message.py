from sqlalchemy import Column, Integer, Text, DateTime, ForeignKey
from sqlalchemy.sql import func
from app.database import Base


class Message(Base):
    """
    A chat message inside a Workspace collaboration.

    A "collaboration" is just an Application whose status is "accepted" —
    there's no separate collab table. Every message hangs off the
    application_id so a thread is scoped to exactly one creator/business
    pairing on one campaign, same way Deliverable and CalendarEvent do.
    """

    __tablename__ = "messages"

    id = Column(Integer, primary_key=True, index=True)
    application_id = Column(Integer, ForeignKey("applications.id"), nullable=False)
    sender_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    body = Column(Text, nullable=False)
    read_at = Column(DateTime(timezone=True), nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
