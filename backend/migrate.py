"""Idempotent PostgreSQL schema migration for the creator marketplace."""

from sqlalchemy import text
from sqlalchemy import inspect

from app.database import Base, engine
from app.models import (  # noqa: F401 - import all models into metadata
    Application,
    BusinessProfile,
    CalendarEvent,
    Campaign,
    CreatorInvite,
    CreatorProfile,
    CreatorShortlist,
    CreatorSocial,
    Deliverable,
    GiftFulfillment,
    Message,
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
    "ALTER TABLE messages ADD COLUMN IF NOT EXISTS read_at TIMESTAMPTZ",
    "UPDATE messages SET read_at = created_at WHERE read_at IS NULL",
]

print("=" * 58)
print("Creator Marketplace database migration")
print("=" * 58)
Base.metadata.create_all(bind=engine)
with engine.begin() as conn:
    for statement in statements:
        conn.execute(text(statement))
    conn.execute(text("CREATE UNIQUE INDEX IF NOT EXISTS uq_notifications_event_key ON notifications(event_key) WHERE event_key IS NOT NULL"))

inspector = inspect(engine)
print("\nTables:")
for table in sorted(inspector.get_table_names()):
    print("  -", table)
print("\nMigration complete.")
