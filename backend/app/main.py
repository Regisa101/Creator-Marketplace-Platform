from fastapi import FastAPI

from app.database import Base, engine
from app.routes.auth import router as auth_router

app = FastAPI(
    title="Creator Marketplace Platform",
    version="1.0.0"
)

Base.metadata.create_all(bind=engine)

app.include_router(auth_router)


@app.get("/")
def root():
    return {
        "message": "Creator Marketplace API is running"
    }