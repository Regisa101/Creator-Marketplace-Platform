from passlib.context import CryptContext
from datetime import datetime, timedelta
from jose import JWTError, jwt
import hashlib
import os
from dotenv import load_dotenv

load_dotenv()

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

# JWT
SECRET_KEY = os.getenv("JWT_SECRET", "your-secret-key-change-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24

def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def decode_token(token: str) -> dict:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except JWTError:
        return None


# ------------------------------------------------------------------
# Password-reset tokens
#
# A reset link carries a signed token. Design notes:
#   * Signed with a DIFFERENT key than login tokens, so a reset token can
#     never be used as an access token (and vice versa).
#   * Expires after PASSWORD_RESET_EXPIRE_MINUTES.
#   * Embeds a fingerprint of the user's current password hash. Once the
#     password changes, the fingerprint no longer matches, so each link
#     works exactly once - with no extra database table needed.
# ------------------------------------------------------------------
PASSWORD_RESET_EXPIRE_MINUTES = int(os.getenv("PASSWORD_RESET_EXPIRE_MINUTES", "30") or 30)
_RESET_KEY = SECRET_KEY + "::password-reset"


def password_fingerprint(hashed_password: str) -> str:
    return hashlib.sha256((hashed_password or "").encode("utf-8")).hexdigest()[:24]


def create_password_reset_token(user_id: int, hashed_password: str) -> str:
    payload = {
        "sub": str(user_id),
        "purpose": "password_reset",
        "fp": password_fingerprint(hashed_password),
        "exp": datetime.utcnow() + timedelta(minutes=PASSWORD_RESET_EXPIRE_MINUTES),
    }
    return jwt.encode(payload, _RESET_KEY, algorithm=ALGORITHM)


def decode_password_reset_token(token: str):
    """Return the payload, or None if the token is invalid, expired or not a reset token."""
    try:
        payload = jwt.decode(token, _RESET_KEY, algorithms=[ALGORITHM])
    except JWTError:
        return None
    if payload.get("purpose") != "password_reset" or not payload.get("sub"):
        return None
    return payload