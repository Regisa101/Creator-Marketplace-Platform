"""
MIGRATION: Add brand-level campaign defaults to business_profiles

business_profiles.default_dos / default_donts / default_video_spec are
new columns needed for the "Brand-Level Defaults" feature. migrate.py's
Base.metadata.create_all() only creates missing TABLES, not missing
COLUMNS on existing tables — so this script exists specifically to add
columns to a table that already exists. Safe to re-run.
"""

from sqlalchemy import text
from app.database import engine

STATEMENTS = [
    "ALTER TABLE business_profiles ADD COLUMN IF NOT EXISTS default_dos JSON",
    "ALTER TABLE business_profiles ADD COLUMN IF NOT EXISTS default_donts JSON",
    "ALTER TABLE business_profiles ADD COLUMN IF NOT EXISTS default_video_spec JSON",
]

print("=" * 50)
print("🔄 Adding campaign defaults columns to business_profiles...")
print("=" * 50)

with engine.connect() as conn:
    for stmt in STATEMENTS:
        print(f"   Running: {stmt}")
        conn.execute(text(stmt))
    conn.commit()

print("\n✅ Done. business_profiles now has: default_dos, default_donts, default_video_spec")