from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database import Base
class PublicationProof(Base):
    __tablename__ = "publication_proofs"
    id = Column(Integer, primary_key=True, index=True)
    application_id = Column(Integer, ForeignKey("applications.id"), nullable=False, index=True)
    deliverable_id = Column(Integer, ForeignKey("deliverables.id"), nullable=True, index=True)
    platform = Column(String(50), nullable=False)
    post_type = Column(String(50), nullable=True)
    post_url = Column(String(1000), nullable=False)
    screenshot_url = Column(String(1000), nullable=True)
    status = Column(String(30), nullable=False, default="pending")
    feedback = Column(Text, nullable=True)
    submitted_at = Column(DateTime(timezone=True), server_default=func.now())
    verified_at = Column(DateTime(timezone=True), nullable=True)
    verified_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    application = relationship("Application")
