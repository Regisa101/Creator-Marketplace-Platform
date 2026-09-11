"""Idempotent migration for campaign-level funding and creator payouts."""
from sqlalchemy import text
from app.database import engine

statements = [
    "ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS funding_status VARCHAR(30) NOT NULL DEFAULT 'unfunded'",
    "ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS funded_amount NUMERIC(10,2)",
    "ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS funded_at TIMESTAMPTZ",
    "ALTER TABLE payments ALTER COLUMN application_id DROP NOT NULL",
    "ALTER TABLE payments ADD COLUMN IF NOT EXISTS campaign_id INTEGER REFERENCES campaigns(id)",
    "ALTER TABLE payments ADD COLUMN IF NOT EXISTS payment_type VARCHAR(30) NOT NULL DEFAULT 'collaboration'",
    "ALTER TABLE payments ADD COLUMN IF NOT EXISTS platform_fee NUMERIC(10,2)",
    "ALTER TABLE payments ADD COLUMN IF NOT EXISTS creator_payout NUMERIC(10,2)",
]
with engine.begin() as conn:
    for statement in statements:
        conn.execute(text(statement))
print("Campaign funding migration complete.")
