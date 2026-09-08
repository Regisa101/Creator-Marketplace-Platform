"""
MIGRATION: Add "Before you apply" checklist + campaign guidelines note

campaigns.before_you_apply / campaigns.guidelines_note are new columns
needed to match the updated campaign detail page design:
  - before_you_apply: the creator self-check list shown under
    "Before you apply" (separate from the brand's `requirements` list).
  - guidelines_note: the short highlighted blurb shown in the
    "Campaign guidelines" callout at the bottom of the page.

Note: `resolution` / `frame_rate` / `file_type` for video specs do NOT
need a migration — they live inside the existing `video_specs` JSON
column, so they only require the Pydantic schema change in
app/schemas/campaign.py.

migrate.py's Base.metadata.create_all() only creates missing TABLES,
not missing COLUMNS on existing tables — so this script exists
specifically to add columns to a table that already exists.
Safe to re-run.
"""

from sqlalchemy import text
from app.database import engine

STATEMENTS = [
    "ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS before_you_apply JSON",
    "ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS guidelines_note TEXT",
]

print("=" * 50)
print("🔄 Adding before_you_apply + guidelines_note columns to campaigns...")
print("=" * 50)

with engine.connect() as conn:
    for stmt in STATEMENTS:
        print(f"   Running: {stmt}")
        conn.execute(text(stmt))
    conn.commit()

print("\n✅ Done. campaigns now has: before_you_apply, guidelines_note")
