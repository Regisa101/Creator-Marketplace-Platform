from __future__ import annotations

import asyncio
from contextlib import suppress
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy import inspect, text

from app.database import Base, SessionLocal, engine
from app.models import Notification  # noqa: F401 - keeps the table in metadata
from app.routes import (
    applications,
    auth,
    businesses,
    campaigns,
    creators,
    gift_fulfillment,
    notifications,
    onboarding,
    payments,
    ratings,
    saved_campaigns,
    uploads,
    workspace,
)
from app.services.deadline_notifications import check_deadline_notifications

app = FastAPI(title="Creator Marketplace API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def ensure_schema() -> None:
    Base.metadata.create_all(bind=engine)
    statements = [
        "ALTER TABLE business_profiles ADD COLUMN IF NOT EXISTS default_dos JSON",
        "ALTER TABLE business_profiles ADD COLUMN IF NOT EXISTS default_donts JSON",
        "ALTER TABLE business_profiles ADD COLUMN IF NOT EXISTS default_video_spec JSON",
        "ALTER TABLE business_profiles ADD COLUMN IF NOT EXISTS default_creator_requirements JSON",
        "ALTER TABLE business_profiles ADD COLUMN IF NOT EXISTS default_application_questions JSON",
        "ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS application_deadline TIMESTAMPTZ",
        "ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS deliverable_deadline TIMESTAMPTZ",
        "ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS creators_needed INTEGER NOT NULL DEFAULT 1",
        "ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS application_questions JSON",
        "ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS creator_requirements JSON",
        "ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS extra_photos JSON",
        "ALTER TABLE applications ADD COLUMN IF NOT EXISTS application_answers JSON",
        "ALTER TABLE applications ADD COLUMN IF NOT EXISTS selected_portfolio JSON",
        "ALTER TABLE applications ADD COLUMN IF NOT EXISTS deliverable_deadline TIMESTAMPTZ",
        "ALTER TABLE payments ADD COLUMN IF NOT EXISTS payment_details JSON",
        "ALTER TABLE notifications ADD COLUMN IF NOT EXISTS event_key VARCHAR(255)",
    ]
    with engine.begin() as conn:
        for statement in statements:
            conn.execute(text(statement))
        # A unique index is safer than a second unique constraint when upgrading an existing DB.
        conn.execute(text("CREATE UNIQUE INDEX IF NOT EXISTS uq_notifications_event_key ON notifications(event_key) WHERE event_key IS NOT NULL"))


@app.on_event("startup")
async def startup() -> None:
    ensure_schema()
    # Create deadline reminders immediately, then repeat hourly.
    check_deadline_notifications()
    app.state.deadline_task = asyncio.create_task(_deadline_loop())


@app.on_event("shutdown")
async def shutdown() -> None:
    task = getattr(app.state, "deadline_task", None)
    if task:
        task.cancel()
        with suppress(asyncio.CancelledError):
            await task


async def _deadline_loop() -> None:
    while True:
        await asyncio.sleep(3600)
        try:
            check_deadline_notifications()
        except Exception:
            # A missed reminder should never bring down the API process.
            pass


app.include_router(auth.router)
app.include_router(onboarding.router)
app.include_router(campaigns.router)
app.include_router(applications.router)
app.include_router(uploads.router)
app.include_router(saved_campaigns.router)
app.include_router(businesses.router)
app.include_router(creators.router)
app.include_router(workspace.router)
app.include_router(gift_fulfillment.router)
app.include_router(payments.router)
app.include_router(ratings.router)
app.include_router(notifications.router)

STATIC_DIR = Path(__file__).resolve().parent / "static"
STATIC_DIR.mkdir(parents=True, exist_ok=True)
app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")
