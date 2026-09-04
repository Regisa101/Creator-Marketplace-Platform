from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime, DECIMAL, ForeignKey, JSON
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database import Base  # ← Make sure this is here!

class BusinessProfile(Base):
    __tablename__ = "business_profiles"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, unique=True)
    
    company_name = Column(String(255), nullable=False)
    business_type = Column(String(100), nullable=True)
    industry = Column(String(100), nullable=True)
    location = Column(String(100), nullable=True)
    
    website = Column(String(255), nullable=True)
    description = Column(Text, nullable=True)
    logo_url = Column(String(255), nullable=True)
    contact_phone = Column(String(50), nullable=True)
    
    interested_categories = Column(JSON, nullable=True)
    preferred_content_types = Column(JSON, nullable=True)
    typical_budget = Column(DECIMAL(10,2), nullable=True)
    
    team_size = Column(String(50), nullable=True)
    year_established = Column(Integer, nullable=True)

    # Brand-level campaign defaults (Increment: campaign creation speedup).
    # Copied INTO a campaign at creation time (see Campaignform.tsx's
    # autofill effect) — never referenced dynamically afterwards, so
    # changing these later never touches campaigns already created.
    default_dos = Column(JSON, nullable=True)          # ["Use good lighting", ...]
    default_donts = Column(JSON, nullable=True)         # ["Do not use competitor products", ...]
    default_video_spec = Column(JSON, nullable=True)    # {"platform": "General", "duration": "...", "aspect_ratio": "...", "voiceover_required": bool, "subtitles_required": bool}
    
    is_onboarding_complete = Column(Boolean, default=False)
    is_published = Column(Boolean, default=False)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    user = relationship("User", back_populates="business_profile")