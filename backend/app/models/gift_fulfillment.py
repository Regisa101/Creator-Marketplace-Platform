from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.sql import func
from app.database import Base


class GiftFulfillment(Base):
    """Product hand-off details for gifted creator collaborations."""
    __tablename__ = "gift_fulfillments"

    id = Column(Integer, primary_key=True, index=True)
    application_id = Column(Integer, ForeignKey("applications.id"), nullable=False, unique=True, index=True)

    method = Column(String(20), nullable=True)  # pickup | shipping
    status = Column(String(30), nullable=False, default="pending")

    recipient_name = Column(String(180), nullable=True)
    shipping_address = Column(Text, nullable=True)
    phone = Column(String(40), nullable=True)

    pickup_location = Column(String(255), nullable=True)
    pickup_available_from = Column(DateTime(timezone=True), nullable=True)
    pickup_code = Column(String(40), nullable=True)

    courier = Column(String(120), nullable=True)
    tracking_number = Column(String(120), nullable=True)
    notes = Column(Text, nullable=True)

    received_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
