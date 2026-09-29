"""Add the immutable evidence snapshot used by contract history.

Run once against an existing PostgreSQL database. New installs get the column
from SQLAlchemy metadata automatically.
"""
from sqlalchemy import text
from app.database import engine

with engine.begin() as conn:
    conn.execute(text("ALTER TABLE contracts ADD COLUMN IF NOT EXISTS evidence_snapshot JSONB"))

print("✅ contracts.evidence_snapshot is ready")
