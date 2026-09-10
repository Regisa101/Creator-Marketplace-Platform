from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.sql import func
from app.database import Base


class CalendarEvent(Base):
    __tablename__ = "calendar_events"

    id = Column(Integer, primary_key=True, index=True)
    # Nullable: an event can be tied to a specific collaboration
    # (application_id) once a creator is accepted, OR to the campaign as a
    # whole (campaign_id) from the moment it's published — before anyone's
    # accepted, so the brand can track it too. An event has at least one
    # of the two set.
    application_id = Column(Integer, ForeignKey("applications.id"), nullable=True)
    campaign_id = Column(Integer, ForeignKey("campaigns.id"), nullable=True)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)

    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    event_date = Column(DateTime(timezone=True), nullable=False)

    # milestone, deadline, call, posting_date, other
    event_type = Column(String(50), default="milestone")

    created_at = Column(DateTime(timezone=True), server_default=func.now())