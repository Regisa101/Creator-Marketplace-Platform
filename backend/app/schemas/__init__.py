"""
SCHEMAS PACKAGE
---------------
This makes all schemas available from one place.

Usage:
    from app.schemas import UserCreate, UserLogin, UserResponse
"""

from app.schemas.user import (
    UserBase,
    UserCreate,
    UserLogin,
    UserResponse,
    TokenResponse
)