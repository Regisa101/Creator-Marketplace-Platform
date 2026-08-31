from sqlalchemy import Column, Integer, String, Boolean, DateTime
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database import Base

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    full_name = Column(String, nullable=False)
    password = Column(String, nullable=False)
    role = Column(String, nullable=False, default="creator")
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    last_login = Column(DateTime(timezone=True), nullable=True)
    
    # Relationships
    creator_profile = relationship("CreatorProfile", back_populates="user", uselist=False, cascade="all, delete-orphan")
    business_profile = relationship("BusinessProfile", back_populates="user", uselist=False, cascade="all, delete-orphan")

    # ============================================
    # PROFILE (computed, not a column)
    # ============================================
    # UserResponse (schemas/user.py) reads this to embed profile data in
    # every auth response — /auth/register, /auth/login, and /auth/me —
    # so a fresh login always reflects whatever was actually saved to
    # the database, instead of relying on the frontend's localStorage
    # cache (which is wiped on logout). No migration needed: this is a
    # plain Python property over the existing creator_profile /
    # business_profile relationships, not a new column.
    #
    # Field names here deliberately match what the frontend already
    # sends in CreatorOnboarding.tsx's saveStepXProgress payloads
    # (niches, content_languages, audience_interests) rather than the
    # raw DB column names (categories, languages, interests) — so
    # `user.profile` looks the same everywhere, regardless of whether
    # it came from this endpoint, from PATCH /creator/progress's
    # response, or from AuthContext's optimistic updateProfile().
    @property
    def profile(self):
        if self.role == "creator" and self.creator_profile:
            p = self.creator_profile
            return {
                "display_name": p.display_name,
                "username": p.username,
                "bio": p.bio,
                "location": p.location,
                "profile_image": p.profile_image,
                "creator_type": p.creator_type,
                "niches": p.categories,
                "content_types": p.content_types,
                "content_languages": p.languages,
                "audience_age_range": p.audience_age_range,
                "audience_location": p.audience_location,
                "audience_interests": p.interests,
                "starting_price": float(p.starting_price) if p.starting_price is not None else None,
                "portfolio": p.portfolio,
                "socials": [
                    {
                        "platform": s.platform,
                        "username": s.username,
                        "profile_url": s.profile_url,
                        "follower_count": s.follower_count,
                        "is_verified": s.is_verified,
                    }
                    for s in (p.socials or [])
                ],
                "is_onboarding_complete": p.is_onboarding_complete,
                "is_published": p.is_published,
            }

        if self.role == "business" and self.business_profile:
            p = self.business_profile
            return {
                "company_name": p.company_name,
                "business_type": p.business_type,
                "industry": p.industry,
                "location": p.location,
                "website": p.website,
                "description": p.description,
                "logo_url": p.logo_url,
                "contact_phone": p.contact_phone,
                "interested_categories": p.interested_categories,
                "preferred_content_types": p.preferred_content_types,
                "typical_budget": float(p.typical_budget) if p.typical_budget is not None else None,
                "team_size": p.team_size,
                "year_established": p.year_established,
                "is_onboarding_complete": p.is_onboarding_complete,
                "is_published": p.is_published,
            }

        return None

    def __repr__(self):
        return f"<User {self.email}>"