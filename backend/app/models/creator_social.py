from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, DateTime  # ← FIXED: added Boolean
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database import Base  # ← FIXED: added Base

class CreatorSocial(Base):
    __tablename__ = "creator_socials"
    
    id = Column(Integer, primary_key=True, index=True)
    creator_id = Column(Integer, ForeignKey("creator_profiles.id"), nullable=False)
    
    platform = Column(String(50), nullable=False)
    username = Column(String(100), nullable=True)
    profile_url = Column(String(255), nullable=True)
    follower_count = Column(Integer, default=0)
    is_verified = Column(Boolean, default=False)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    creator_profile = relationship("CreatorProfile", back_populates="socials")