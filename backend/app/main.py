from __future__ import annotations

import asyncio
from contextlib import suppress
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy import text

from app.database import Base, engine
from app.models import Notification  # noqa: F401 - loads models into metadata

from app.routes import (
    applications,
    auth,
    businesses,
    campaigns,
    creators,
    notifications,
    negotiations,
    publication,
    onboarding,
    payments,
    ratings,
    saved_campaigns,
    uploads,
    workspace,
    campaign_performance,
)

from app.services.deadline_notifications import check_deadline_notifications


app = FastAPI(title="Creator Marketplace API")


# ============================================================
# CORS
# ============================================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============================================================
# DATABASE SCHEMA
# ============================================================

def ensure_schema() -> None:
    """
    Create missing tables and upgrade existing tables with
    the columns required by the current application.
    """

    # Create all tables represented in SQLAlchemy metadata.
    Base.metadata.create_all(bind=engine)

    statements = [
        # ----------------------------------------------------
        # BUSINESS PROFILE DEFAULTS
        # ----------------------------------------------------
        "ALTER TABLE business_profiles ADD COLUMN IF NOT EXISTS default_dos JSON",
        "ALTER TABLE business_profiles ADD COLUMN IF NOT EXISTS default_donts JSON",
        "ALTER TABLE business_profiles ADD COLUMN IF NOT EXISTS default_video_spec JSON",
        "ALTER TABLE business_profiles ADD COLUMN IF NOT EXISTS default_creator_requirements JSON",
        "ALTER TABLE business_profiles ADD COLUMN IF NOT EXISTS default_application_questions JSON",

        # ----------------------------------------------------
        # CAMPAIGNS
        # ----------------------------------------------------
        "ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS application_deadline TIMESTAMPTZ",
        "ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS deliverable_deadline TIMESTAMPTZ",
        "ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS creators_needed INTEGER NOT NULL DEFAULT 1",
        "ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS application_questions JSON",
        "ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS creator_requirements JSON",
        "ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS extra_photos JSON",

        # Funding (paid campaigns are not open for applications until funded)
        "ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS funding_status VARCHAR(30) NOT NULL DEFAULT 'unfunded'",
        "ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS funded_amount NUMERIC(10,2)",
        "ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS funded_at TIMESTAMPTZ",

        # Campaign completion/publication rules
        "ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS completion_mode VARCHAR(30) NOT NULL DEFAULT 'approval_only'",
        "ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS required_platform VARCHAR(50)",
        "ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS required_post_type VARCHAR(50)",
        "ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS publication_deadline TIMESTAMPTZ",
        "ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS required_mentions JSONB",
        "ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS required_platforms JSONB",
        "ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS required_post_types JSONB",
        # Backfill the new multi-select columns from any existing single-value data.
        "UPDATE campaigns SET required_platforms = to_jsonb(ARRAY[required_platform]) "
        "WHERE required_platforms IS NULL AND required_platform IS NOT NULL",
        "UPDATE campaigns SET required_post_types = to_jsonb(ARRAY[required_post_type]) "
        "WHERE required_post_types IS NULL AND required_post_type IS NOT NULL",

        # ----------------------------------------------------
        # APPLICATIONS
        # ----------------------------------------------------
        "ALTER TABLE applications ADD COLUMN IF NOT EXISTS application_answers JSON",
        "ALTER TABLE applications ADD COLUMN IF NOT EXISTS selected_portfolio JSON",
        "ALTER TABLE applications ADD COLUMN IF NOT EXISTS deliverable_deadline TIMESTAMPTZ",

        # Negotiation
        "ALTER TABLE applications ADD COLUMN IF NOT EXISTS agreed_rate NUMERIC(10,2)",
        "ALTER TABLE applications ADD COLUMN IF NOT EXISTS rate_locked INTEGER NOT NULL DEFAULT 0",
        "ALTER TABLE applications ADD COLUMN IF NOT EXISTS negotiation_status VARCHAR(30) NOT NULL DEFAULT 'not_started'",

        # ----------------------------------------------------
        # PAYMENTS
        # ----------------------------------------------------
        "ALTER TABLE payments ADD COLUMN IF NOT EXISTS payment_details JSON",

        # ----------------------------------------------------
        # NOTIFICATIONS
        # ----------------------------------------------------
        "ALTER TABLE notifications ADD COLUMN IF NOT EXISTS event_key VARCHAR(255)",

        # ----------------------------------------------------
        # CALENDAR EVENTS
        # ----------------------------------------------------
        # Campaign-level events (application deadline, deliverable deadline,
        # publication deadline) exist from the moment a campaign is
        # published, before any creator is accepted — so application_id can
        # no longer be required.
        "ALTER TABLE calendar_events ADD COLUMN IF NOT EXISTS campaign_id INTEGER REFERENCES campaigns(id)",
        "ALTER TABLE calendar_events ALTER COLUMN application_id DROP NOT NULL",

        # ----------------------------------------------------
        # CAMPAIGN PERFORMANCE / ROI
        # ----------------------------------------------------
        "ALTER TABLE campaign_performances ADD COLUMN IF NOT EXISTS revenue NUMERIC(12,2) NOT NULL DEFAULT 0",
        "ALTER TABLE campaign_performances ADD COLUMN IF NOT EXISTS other_costs NUMERIC(12,2) NOT NULL DEFAULT 0",
        "ALTER TABLE campaign_performances ADD COLUMN IF NOT EXISTS sales_count INTEGER",
        "ALTER TABLE campaign_performances ADD COLUMN IF NOT EXISTS reach INTEGER",
        "ALTER TABLE campaign_performances ADD COLUMN IF NOT EXISTS engagement INTEGER",
        "ALTER TABLE campaign_performances ADD COLUMN IF NOT EXISTS notes TEXT",
    ]

    with engine.begin() as conn:
        for statement in statements:
            conn.execute(text(statement))

        # Prevent duplicate notification event keys.
        conn.execute(
            text(
                """
                CREATE UNIQUE INDEX IF NOT EXISTS
                uq_notifications_event_key
                ON notifications(event_key)
                WHERE event_key IS NOT NULL
                """
            )
        )


# ============================================================
# STARTUP
# ============================================================

@app.on_event("startup")
async def startup() -> None:
    ensure_schema()

    # Run deadline notifications once when the server starts.
    try:
        check_deadline_notifications()
    except Exception as exc:
        print(f"Deadline notification check skipped: {exc}")

    # Continue checking every hour.
    app.state.deadline_task = asyncio.create_task(
        _deadline_loop()
    )


# ============================================================
# SHUTDOWN
# ============================================================

@app.on_event("shutdown")
async def shutdown() -> None:
    task = getattr(app.state, "deadline_task", None)

    if task:
        task.cancel()

        with suppress(asyncio.CancelledError):
            await task


# ============================================================
# DEADLINE NOTIFICATION LOOP
# ============================================================

async def _deadline_loop() -> None:
    while True:
        await asyncio.sleep(3600)

        try:
            check_deadline_notifications()
        except Exception as exc:
            # Notification failures must never crash the API.
            print(f"Deadline notification error: {exc}")


# ============================================================
# API ROUTES
# ============================================================

app.include_router(auth.router)
app.include_router(onboarding.router)
app.include_router(campaigns.router)
app.include_router(applications.router)
app.include_router(uploads.router)
app.include_router(saved_campaigns.router)
app.include_router(businesses.router)
app.include_router(creators.router)
app.include_router(workspace.router)
app.include_router(payments.router)
app.include_router(ratings.router)
app.include_router(notifications.router)
app.include_router(negotiations.router)
app.include_router(publication.router)
app.include_router(campaign_performance.router)


# ============================================================
# STATIC FILES
# ============================================================

STATIC_DIR = Path(__file__).resolve().parent / "static"
STATIC_DIR.mkdir(parents=True, exist_ok=True)

app.mount(
    "/static",
    StaticFiles(directory=STATIC_DIR),
    name="static",
)