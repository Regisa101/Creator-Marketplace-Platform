from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from app.database import engine, Base
from app.models import User, CreatorProfile, BusinessProfile, CreatorSocial
from app.routes import auth, onboarding, uploads

app = FastAPI(
    title="Creator Marketplace Platform",
    description="AI-powered creator collaboration platform",
    version="1.0.0"
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Create tables
Base.metadata.create_all(bind=engine)

# Serve uploaded files (profile photos, logos, etc.) — must exist on
# disk before the mount, so app/routes/uploads.py already creates it,
# but this covers the case where the app starts before any upload has
# happened yet.
STATIC_DIR = Path(__file__).resolve().parent / "static"
STATIC_DIR.mkdir(parents=True, exist_ok=True)
app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")

# Routes
app.include_router(auth.router)
app.include_router(onboarding.router)
app.include_router(uploads.router)

@app.get("/")
def root():
    return {"message": "Welcome to Creator Marketplace Platform API"}

@app.get("/health")
def health_check():
    return {"status": "healthy"}