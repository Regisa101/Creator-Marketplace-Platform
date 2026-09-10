import os
from dotenv import load_dotenv

load_dotenv()

DB_USER = os.getenv("DB_USER")
DB_PASSWORD = os.getenv("DB_PASSWORD")
DB_HOST = os.getenv("DB_HOST", "localhost")
DB_PORT = os.getenv("DB_PORT", "5432")
DB_NAME = os.getenv("DB_NAME", "creator_marketplace")

# Payments are intentionally demo-first for this prototype. Switch to
# PAYMENT_MODE=khalti only after a real merchant secret is configured.
PAYMENT_MODE = os.getenv("PAYMENT_MODE", "demo").strip().lower()

KHALTI_SECRET_KEY = os.getenv("KHALTI_SECRET_KEY", "").strip()
KHALTI_BASE_URL = os.getenv("KHALTI_BASE_URL", "https://dev.khalti.com").rstrip("/")
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173").rstrip("/")
