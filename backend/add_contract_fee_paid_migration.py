"""
MIGRATION: Add fee_paid_at to contracts

contracts.fee_paid_at is a new column needed for manual/offline service-fee
tracking (CreatorHub doesn't collect payment itself, so the business
self-reports when it has settled the 10% platform fee). migrate.py's
Base.metadata.create_all() only creates missing TABLES, not missing
COLUMNS on existing tables — so this script exists specifically to add
a column to a table that already exists. Safe to re-run.
"""

from sqlalchemy import text
from app.database import engine

STATEMENTS = [
    "ALTER TABLE contracts ADD COLUMN IF NOT EXISTS fee_paid_at TIMESTAMPTZ",
]

print("=" * 50)
print("🔄 Adding fee_paid_at column to contracts...")
print("=" * 50)

with engine.connect() as conn:
    for stmt in STATEMENTS:
        print(f"   Running: {stmt}")
        conn.execute(text(stmt))
    conn.commit()

print("\n✅ Done. contracts now has: fee_paid_at")