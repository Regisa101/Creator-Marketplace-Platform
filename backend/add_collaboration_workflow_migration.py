"""Idempotent migration for the creator-confirmation workflow.

Adds the two post-selection gates used by the collaboration hub and a read
marker for chat messages so unread badges can be calculated per creator.
Run this once against the same PostgreSQL database used by the app.
"""
from sqlalchemy import text
from app.database import engine

STATEMENTS = [
    "ALTER TABLE applications ADD COLUMN IF NOT EXISTS creator_confirmed BOOLEAN NOT NULL DEFAULT FALSE",
    "ALTER TABLE applications ADD COLUMN IF NOT EXISTS creator_verified BOOLEAN NOT NULL DEFAULT FALSE",
    "ALTER TABLE messages ADD COLUMN IF NOT EXISTS read_at TIMESTAMPTZ",
    "UPDATE messages SET read_at = created_at WHERE read_at IS NULL",
]

with engine.begin() as conn:
    for statement in STATEMENTS:
        conn.execute(text(statement))

print("Collaboration workflow migration complete.")
