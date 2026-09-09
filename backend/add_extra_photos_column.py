"""
MIGRATION: Add extra_photos column to campaigns
"""

from app.database import engine
from sqlalchemy import text

def add_extra_photos():
    with engine.connect() as conn:
        try:
            conn.execute(text("ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS extra_photos JSON"))
            conn.commit()
            print("✅ extra_photos column added successfully!")
        except Exception as e:
            print(f"❌ Error: {e}")

if __name__ == "__main__":
    add_extra_photos()