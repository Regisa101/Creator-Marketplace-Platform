"""Idempotent PostgreSQL schema migration for the creator marketplace."""

from sqlalchemy import inspect, text

from app.database import Base, engine
from app.models import (  # noqa: F401 - import all models into metadata
    Application,
    BusinessProfile,
    Campaign,
    CreatorInvite,
    CreatorProfile,
    CreatorShortlist,
    CreatorSocial,
    Deliverable,
    Notification,
    Payment,
    Rating,
    SavedCampaign,
    User,
)


statements = [
    "ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS application_deadline TIMESTAMPTZ",
    "ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS deliverable_deadline TIMESTAMPTZ",
    "ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS creators_needed INTEGER NOT NULL DEFAULT 1",
    "ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS application_questions JSON",
    "ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS creator_requirements JSON",
    "ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS extra_photos JSON",

    "ALTER TABLE business_profiles ADD COLUMN IF NOT EXISTS default_dos JSON",
    "ALTER TABLE business_profiles ADD COLUMN IF NOT EXISTS default_donts JSON",
    "ALTER TABLE business_profiles ADD COLUMN IF NOT EXISTS default_video_spec JSON",
    "ALTER TABLE business_profiles ADD COLUMN IF NOT EXISTS default_creator_requirements JSON",
    "ALTER TABLE business_profiles ADD COLUMN IF NOT EXISTS default_application_questions JSON",

    "ALTER TABLE applications ADD COLUMN IF NOT EXISTS application_answers JSON",
    "ALTER TABLE applications ADD COLUMN IF NOT EXISTS creator_confirmed BOOLEAN NOT NULL DEFAULT FALSE",
    "ALTER TABLE applications ADD COLUMN IF NOT EXISTS creator_verified BOOLEAN NOT NULL DEFAULT FALSE",
    "ALTER TABLE applications ADD COLUMN IF NOT EXISTS selected_portfolio JSON",
    "ALTER TABLE applications ADD COLUMN IF NOT EXISTS deliverable_deadline TIMESTAMPTZ",

    "ALTER TABLE payments ADD COLUMN IF NOT EXISTS payment_details JSON",

    "ALTER TABLE notifications ADD COLUMN IF NOT EXISTS event_key VARCHAR(255)",
]


print("=" * 58)
print("Creator Marketplace database migration")
print("=" * 58)


# ------------------------------------------------------------------
# Create missing tables from the current SQLAlchemy models.
# This is safe to run repeatedly.
# ------------------------------------------------------------------

print("\nCreating missing tables...")
Base.metadata.create_all(bind=engine)


# ------------------------------------------------------------------
# Apply schema changes.
# ------------------------------------------------------------------

print("\nApplying schema changes:")

with engine.begin() as conn:
    for statement in statements:
        print("  ", statement)
        conn.execute(text(statement))

    print("  Creating notification event_key index...")

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


# ------------------------------------------------------------------
# Show final database tables.
# ------------------------------------------------------------------

inspector = inspect(engine)

print("\nTables:")

for table in sorted(inspector.get_table_names()):
    print("  -", table)


print("\nMigration complete.")
print("=" * 58)