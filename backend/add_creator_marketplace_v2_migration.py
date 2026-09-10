"""Add campaign lifecycle/application-selection fields and application evidence fields."""
from sqlalchemy import text
from app.database import engine

statements = [
    "ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS application_deadline TIMESTAMPTZ",
    "ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS deliverable_deadline TIMESTAMPTZ",
    "ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS creators_needed INTEGER NOT NULL DEFAULT 1",
    "ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS application_questions JSON",
    "ALTER TABLE applications ADD COLUMN IF NOT EXISTS application_answers JSON",
    "ALTER TABLE applications ADD COLUMN IF NOT EXISTS selected_portfolio JSON",
    "ALTER TABLE applications ADD COLUMN IF NOT EXISTS deliverable_deadline TIMESTAMPTZ",
]
with engine.begin() as conn:
    for stmt in statements:
        conn.execute(text(stmt))
print("Marketplace v2 migration complete.")
