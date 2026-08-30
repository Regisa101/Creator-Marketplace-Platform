from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime, DECIMAL, ForeignKey, JSON
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database import Base  # ← FIXED

class CreatorProfile(Base):
    __tablename__ = "creator_profiles"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, unique=True)
    
    # ===== BASIC INFO =====
    display_name = Column(String(100), nullable=True)
    username = Column(String(50), nullable=True, unique=True)
    bio = Column(Text, nullable=True)
    location = Column(String(100), nullable=True)
    profile_image = Column(String(255), nullable=True)
    
    # ===== TYPE & NICHE =====
    creator_type = Column(String(50), nullable=True)
    categories = Column(JSON, nullable=True)
    content_types = Column(JSON, nullable=True)
    languages = Column(JSON, nullable=True)
    
    # ===== AUDIENCE =====
    audience_age_range = Column(JSON, nullable=True)
    audience_location = Column(JSON, nullable=True)
    interests = Column(JSON, nullable=True)
    
    # ===== PRICING =====
    starting_price = Column(DECIMAL(10,2), nullable=True)
    
    # ===== PORTFOLIO =====
    portfolio = Column(JSON, nullable=True)
    
    # ===== STATUS =====
    is_onboarding_complete = Column(Boolean, default=False)
    is_published = Column(Boolean, default=False)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # ===== RELATIONSHIPS =====
    user = relationship("User", back_populates="creator_profile")
    socials = relationship("CreatorSocial", back_populates="creator_profile", cascade="all, delete-orphan")