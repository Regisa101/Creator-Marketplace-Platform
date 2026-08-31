from fastapi import FastAPI
from app.routes import auth, onboarding, campaigns, applications

app = FastAPI()

# Include routers
app.include_router(auth.router)
app.include_router(onboarding.router)
app.include_router(campaigns.router)
app.include_router(applications.router)