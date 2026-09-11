"""Upgrade campaigns.sub_category from VARCHAR(100) to TEXT.

Run from backend:
    python add_campaign_subcategory_text_migration.py
"""

from sqlalchemy import text
from app.database import engine

with engine.begin() as conn:
    conn.execute(text("ALTER TABLE campaigns ALTER COLUMN sub_category TYPE TEXT"))

print("campaigns.sub_category is now TEXT.")
