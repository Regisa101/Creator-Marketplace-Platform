from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import User
from app.auth import decode_token

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")
oauth2_optional_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login", auto_error=False)


async def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    payload = decode_token(token)
    if not payload:
        raise credentials_exception
    user_id = payload.get("user_id")
    if not user_id:
        raise credentials_exception
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise credentials_exception
    if not user.is_active:
        raise HTTPException(status_code=400, detail="User account is deactivated")
    return user


def get_current_business(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role not in ("business", "admin"):
        raise HTTPException(status_code=403, detail="Business access required")
    return current_user


def get_current_creator(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role not in ("creator", "admin"):
        raise HTTPException(status_code=403, detail="Creator access required")
    return current_user


def get_current_admin(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return current_user


async def get_current_user_optional(token: str | None = Depends(oauth2_optional_scheme), db: Session = Depends(get_db)):
    if not token:
        return None
    try:
        payload = decode_token(token)
        user_id = payload.get("user_id") if payload else None
        return db.query(User).filter(User.id == user_id).first() if user_id else None
    except Exception:
        return None
