from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.routes import auth, onboarding, campaigns, applications, uploads

app = FastAPI()

# Vite's dev server (5173) and the FastAPI backend (8000) are different
# origins, so browser fetch/axios calls from the frontend — including
# the multipart upload POST, which triggers a CORS preflight — need
# this or they're blocked client-side before the backend ever sees them.
# This was never noticed if testing happened through /docs (Swagger),
# which is same-origin with the API and isn't subject to CORS at all.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router)
app.include_router(onboarding.router)
app.include_router(campaigns.router)
app.include_router(applications.router)
app.include_router(uploads.router)

# Serves whatever uploads.py writes to backend/app/static/uploads at
# http://localhost:8000/static/uploads/<filename> — this mount was
# referenced in uploads.py's own comments but never actually added,
# which is why uploaded logos/avatars 404'd instead of loading.
STATIC_DIR = Path(__file__).resolve().parent / "static"
STATIC_DIR.mkdir(parents=True, exist_ok=True)
app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")