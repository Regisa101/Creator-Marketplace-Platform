from __future__ import annotations

from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy import text

from app.database import Base, engine

# Import Notification so SQLAlchemy includes the model
# when creating database metadata.
from app.models import Notification  # noqa: F401


# ============================================================
# ACTIVE ROUTES
# ============================================================

from app.routes import (
    applications,
    auth,
    businesses,
    campaigns,
    creators,
    notifications,
    onboarding,
    payments,
    saved_campaigns,
    uploads,
    admin,
)


# ============================================================
# FASTAPI APPLICATION
# ============================================================

app = FastAPI(
    title="Creator Marketplace API"
)


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

    allow_methods=[
        "*"
    ],

    allow_headers=[
        "*"
    ],
)


# ============================================================
# DATABASE SCHEMA
# ============================================================

def ensure_schema() -> None:
    """
    Create missing database tables and add columns required
    by the current CreatorHub application.

    Existing database tables are preserved.
    """

    # Create all currently registered SQLAlchemy tables.
    Base.metadata.create_all(
        bind=engine
    )

    statements = [

        # ====================================================
        # CREATOR PROFILE
        # ====================================================

        """
        ALTER TABLE creator_profiles
        ADD COLUMN IF NOT EXISTS availability VARCHAR(30)
        """,

        # ====================================================
        # BUSINESS PROFILE
        # ====================================================

        """
        ALTER TABLE business_profiles
        ADD COLUMN IF NOT EXISTS contact_person_name VARCHAR(120)
        """,

        """
        ALTER TABLE business_profiles
        ADD COLUMN IF NOT EXISTS social_links JSON
        """,

        # Campaign defaults
        """
        ALTER TABLE business_profiles
        ADD COLUMN IF NOT EXISTS default_dos JSON
        """,

        """
        ALTER TABLE business_profiles
        ADD COLUMN IF NOT EXISTS default_donts JSON
        """,

        """
        ALTER TABLE business_profiles
        ADD COLUMN IF NOT EXISTS default_video_spec JSON
        """,

        """
        ALTER TABLE business_profiles
        ADD COLUMN IF NOT EXISTS default_creator_requirements JSON
        """,

        """
        ALTER TABLE business_profiles
        ADD COLUMN IF NOT EXISTS default_application_questions JSON
        """,

        # ====================================================
        # CAMPAIGNS
        # ====================================================

        """
        ALTER TABLE campaigns
        ADD COLUMN IF NOT EXISTS application_deadline TIMESTAMPTZ
        """,

        """
        ALTER TABLE campaigns
        ADD COLUMN IF NOT EXISTS deliverable_deadline TIMESTAMPTZ
        """,

        """
        ALTER TABLE campaigns
        ADD COLUMN IF NOT EXISTS creators_needed
        INTEGER NOT NULL DEFAULT 1
        """,

        """
        ALTER TABLE campaigns
        ADD COLUMN IF NOT EXISTS application_questions JSON
        """,

        """
        ALTER TABLE campaigns
        ADD COLUMN IF NOT EXISTS creator_requirements JSON
        """,

        """
        ALTER TABLE campaigns
        ADD COLUMN IF NOT EXISTS extra_photos JSON
        """,

        # ====================================================
        # FUNDING / PAYMENT COMPATIBILITY
        # ====================================================

        """
        ALTER TABLE campaigns
        ADD COLUMN IF NOT EXISTS funding_status
        VARCHAR(30) NOT NULL DEFAULT 'unfunded'
        """,

        """
        ALTER TABLE campaigns
        ADD COLUMN IF NOT EXISTS funded_amount
        NUMERIC(10,2)
        """,

        """
        ALTER TABLE campaigns
        ADD COLUMN IF NOT EXISTS funded_at
        TIMESTAMPTZ
        """,

        # ====================================================
        # LEGACY CAMPAIGN COLUMNS
        #
        # These are retained in the database for compatibility
        # with existing databases, but the current frontend does
        # not use the old publication workflow.
        # ====================================================

        """
        ALTER TABLE campaigns
        ADD COLUMN IF NOT EXISTS completion_mode
        VARCHAR(30) DEFAULT 'approval_only'
        """,

        """
        ALTER TABLE campaigns
        ADD COLUMN IF NOT EXISTS required_platform
        VARCHAR(50)
        """,

        """
        ALTER TABLE campaigns
        ADD COLUMN IF NOT EXISTS required_post_type
        VARCHAR(50)
        """,

        """
        ALTER TABLE campaigns
        ADD COLUMN IF NOT EXISTS publication_deadline
        TIMESTAMPTZ
        """,

        """
        ALTER TABLE campaigns
        ADD COLUMN IF NOT EXISTS required_mentions JSONB
        """,

        """
        ALTER TABLE campaigns
        ADD COLUMN IF NOT EXISTS required_platforms JSONB
        """,

        """
        ALTER TABLE campaigns
        ADD COLUMN IF NOT EXISTS required_post_types JSONB
        """,

        # ====================================================
        # APPLICATIONS
        # ====================================================

        """
        ALTER TABLE applications
        ADD COLUMN IF NOT EXISTS application_answers JSON
        """,

        """
        ALTER TABLE applications
        ADD COLUMN IF NOT EXISTS selected_portfolio JSON
        """,

        """
        ALTER TABLE applications
        ADD COLUMN IF NOT EXISTS deliverable_deadline
        TIMESTAMPTZ
        """,

        # Existing application payment/rate compatibility
        """
        ALTER TABLE applications
        ADD COLUMN IF NOT EXISTS agreed_rate
        NUMERIC(10,2)
        """,

        """
        ALTER TABLE applications
        ADD COLUMN IF NOT EXISTS rate_locked
        INTEGER NOT NULL DEFAULT 0
        """,

        # ====================================================
        # PAYMENTS
        # ====================================================

        """
        ALTER TABLE payments
        ADD COLUMN IF NOT EXISTS payment_details JSON
        """,

        # ====================================================
        # NOTIFICATIONS
        # ====================================================

        """
        ALTER TABLE notifications
        ADD COLUMN IF NOT EXISTS event_key
        VARCHAR(255)
        """,
    ]


    # ========================================================
    # APPLY DATABASE UPDATES
    # ========================================================

    with engine.begin() as connection:

        for statement in statements:

            try:
                connection.execute(
                    text(statement)
                )

            except Exception as exc:
                # Do not prevent the whole API from starting
                # because one compatibility column already exists
                # in a slightly different database state.
                print(
                    "Database schema update skipped:",
                    exc,
                )


        # ====================================================
        # UNIQUE NOTIFICATION EVENT KEY
        # ====================================================

        try:

            connection.execute(
                text(
                    """
                    CREATE UNIQUE INDEX IF NOT EXISTS
                    uq_notifications_event_key
                    ON notifications(event_key)
                    WHERE event_key IS NOT NULL
                    """
                )
            )

        except Exception as exc:

            print(
                "Notification index creation skipped:",
                exc,
            )


# ============================================================
# STARTUP
# ============================================================

@app.on_event("startup")
async def startup() -> None:

    ensure_schema()


# ============================================================
# ACTIVE API ROUTES
# ============================================================

app.include_router(
    auth.router
)

app.include_router(
    onboarding.router
)

app.include_router(
    campaigns.router
)

app.include_router(
    applications.router
)

app.include_router(
    businesses.router
)

app.include_router(
    creators.router
)

app.include_router(
    notifications.router
)

app.include_router(
    payments.router
)

app.include_router(
    saved_campaigns.router
)

app.include_router(
    uploads.router
)

app.include_router(
    admin.router
)


# ============================================================
# STATIC FILES
# ============================================================

STATIC_DIR = (
    Path(__file__).resolve().parent
    / "static"
)

STATIC_DIR.mkdir(
    parents=True,
    exist_ok=True
)


app.mount(
    "/static",
    StaticFiles(
        directory=STATIC_DIR
    ),
    name="static",
)