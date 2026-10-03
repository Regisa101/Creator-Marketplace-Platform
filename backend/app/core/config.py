import os
from dotenv import load_dotenv

load_dotenv()

DB_USER = os.getenv("DB_USER")
DB_PASSWORD = os.getenv("DB_PASSWORD")
DB_HOST = os.getenv("DB_HOST", "localhost")
DB_PORT = os.getenv("DB_PORT", "5432")
DB_NAME = os.getenv("DB_NAME", "creator_marketplace")

# Khalti hosted checkout credentials are read from the backend environment.
PAYMENT_MODE = os.getenv("PAYMENT_MODE", "demo").strip().lower()

KHALTI_SECRET_KEY = os.getenv("KHALTI_SECRET_KEY", "").strip()
KHALTI_BASE_URL = os.getenv("KHALTI_BASE_URL", "https://dev.khalti.com").rstrip("/")
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173").rstrip("/")

# ------------------------------------------------------------------
# Outgoing email (SMTP). All values come from the backend environment
# (.env) -- never hardcode credentials and never expose them to the
# frontend. If SMTP_HOST is empty, email sending is skipped (and logged);
# the rest of the app keeps working.
# For Gmail: SMTP_HOST=smtp.gmail.com, SMTP_PORT=587 and use an
# App Password (not your normal Gmail password) as SMTP_PASSWORD.
# ------------------------------------------------------------------
def _int_env(name: str, default: int) -> int:
    try:
        return int(os.getenv(name, "").strip() or default)
    except ValueError:
        return default


SMTP_HOST = os.getenv("SMTP_HOST", "").strip()
SMTP_PORT = _int_env("SMTP_PORT", 587)
SMTP_USERNAME = os.getenv("SMTP_USERNAME", "").strip()
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "").strip()
SMTP_FROM_EMAIL = os.getenv("SMTP_FROM_EMAIL", "").strip() or SMTP_USERNAME

# Google sign-in ("Continue with Google")
GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID", "").strip()

# Forgot password: how long an emailed reset link stays valid (minutes)
PASSWORD_RESET_EXPIRE_MINUTES = _int_env("PASSWORD_RESET_EXPIRE_MINUTES", 30)