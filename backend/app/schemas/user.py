from pydantic import BaseModel, EmailStr, Field
from typing import Optional, Dict, Any
from datetime import datetime

# ============================================
# USER SCHEMAS
# ============================================

class UserBase(BaseModel):
    email: EmailStr
    full_name: str
    role: str = "creator"

class UserCreate(UserBase):
    password: str = Field(..., min_length=6)
    
    # Extra fields for onboarding
    niche: Optional[str] = None
    platform: Optional[str] = None
    audience_size: Optional[str] = None
    company_name: Optional[str] = None
    industry: Optional[str] = None
    team_size: Optional[str] = None
    website: Optional[str] = None

class UserLogin(BaseModel):
    email: EmailStr
    password: str
    # Which login page the request came from ("creator" or "business").
    # Optional so existing/other callers don't break, but when present
    # the backend enforces it matches the account's actual role — see
    # routes/auth.py::login. This is what stops a business account from
    # signing in on the creator login page and vice versa.
    role: Optional[str] = None

class UserResponse(UserBase):
    id: int
    is_active: bool
    created_at: datetime
    last_login: Optional[datetime] = None
    # Populated from User.profile (a computed property in models/user.py,
    # not a DB column) — this is what makes profile data survive a
    # logout/login instead of only existing in the frontend's cache.
    profile: Optional[Dict[str, Any]] = None
    
    class Config:
        from_attributes = True

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

class AccountDeleteRequest(BaseModel):
    # Current password, required as confirmation before permanently
    # deleting the account — see routes/auth.py::delete_account.
    password: str