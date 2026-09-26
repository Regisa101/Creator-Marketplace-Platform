"""Idempotent migration for the collaboration confirmation workflow.

The Application model now contains creator_confirmed and creator_verified.
Existing PostgreSQL databases need these columns added explicitly because
SQLAlchemy create_all() does not alter an existing table.
"""

from sqlalchemy import text
from app.database import engine

STATEMENTS = [
    "ALTER TABLE applications ADD COLUMN IF NOT EXISTS creator_confirmed BOOLEAN NOT NULL DEFAULT FALSE",
    "ALTER TABLE applications ADD COLUMN IF NOT EXISTS creator_verified BOOLEAN NOT NULL DEFAULT FALSE",
]

print("=" * 60)
print("Creator collaboration workflow migration")
print("=" * 60)

with engine.begin() as conn:
    for statement in STATEMENTS:
        print("Running:", statement)
        conn.execute(text(statement))

print("Migration complete.")
