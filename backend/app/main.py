from fastapi import FastAPI
from app.database import engine, Base
from app.models import User  # Import models
from app.routes import auth  # Import routes

app = FastAPI(
    title="Creator Marketplace Platform",
    description="Creator collaboration platform",
    version="1.0.0"
)

# Create all tables
Base.metadata.create_all(bind=engine)

# Include routers
app.include_router(auth.router)

@app.get("/")
def root():
    return {
        "message": "Welcome to Creator Marketplace Platform API",
        "status": "running",
        "version": "1.0.0"
    }

@app.get("/health")
def health_check():
    return {"status": "healthy", "message": "Server is running smoothly!"}