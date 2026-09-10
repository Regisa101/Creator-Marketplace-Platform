from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database import Base


class Rating(Base):
    """
    A brand's rating of a creator for one collaboration. One-directional
    by design — creators don't rate brands here — and tied to a single
    Application, so a business rates each collab once. Gated on payment:
    a rating can only be left once the collab's payment is completed,
    since that's the natural end of the brand<->creator relationship
    for this platform (no post-payment dispute/ongoing-work tracking).
    """
    __tablename__ = "ratings"
    __table_args__ = (UniqueConstraint("application_id", name="uq_rating_per_application"),)

    id = Column(Integer, primary_key=True, index=True)
    application_id = Column(Integer, ForeignKey("applications.id"), nullable=False)
    business_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    creator_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    score = Column(Integer, nullable=False)  # 1-5
    review = Column(Text, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())

    application = relationship("Application")
