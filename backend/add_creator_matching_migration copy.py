"""Add structured creator matching requirements to campaigns. Safe to re-run."""
from sqlalchemy import text
from app.database import engine

with engine.begin() as conn:
    conn.execute(text("ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS creator_requirements JSON"))

print("Creator matching migration complete.")
