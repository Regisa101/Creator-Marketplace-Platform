from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import engine, Base
from app.models import User, CreatorProfile, BusinessProfile, CreatorSocial
from app.routes import auth, onboarding

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

# Routes
app.include_router(auth.router)
app.include_router(onboarding.router)

@app.get("/")
def root():
    return {"message": "Welcome to Creator Marketplace Platform API"}

@app.get("/health")
def health_check():
    return {"status": "healthy"}