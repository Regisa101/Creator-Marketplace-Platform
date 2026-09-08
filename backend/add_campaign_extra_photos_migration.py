"""
MIGRATION: Add extra_photos to campaigns
Safe to re-run.
"""
from sqlalchemy import text
from app.database import engine

STATEMENTS = [
    "ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS extra_photos JSON",
]

with engine.connect() as conn:
    for stmt in STATEMENTS:
        print(f"   Running: {stmt}")
        conn.execute(text(stmt))
    conn.commit()

print("✅ Done. campaigns now has: extra_photos")