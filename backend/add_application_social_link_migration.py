"""
MIGRATION: Add social_link to applications

Creators must now add an Instagram / TikTok / Facebook profile link when they
apply. create_all() does not add columns to existing tables, so run this once.
Safe to re-run.
"""

from sqlalchemy import text
from app.database import engine

STATEMENTS = [
    "ALTER TABLE applications ADD COLUMN IF NOT EXISTS social_link VARCHAR(500)",
]

print("Adding social_link column to applications...")

with engine.connect() as conn:
    for stmt in STATEMENTS:
        print(f"   Running: {stmt}")
        conn.execute(text(stmt))
    conn.commit()

print("Done. applications now has: social_link")