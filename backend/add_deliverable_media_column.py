"""
Add the media_type column to the deliverables table.

Safe to run multiple times because PostgreSQL's
IF NOT EXISTS is used.
"""

from sqlalchemy import text

from app.database import engine


def add_deliverable_media_type():
    with engine.begin() as conn:
        conn.execute(
            text(
                """
                ALTER TABLE deliverables
                ADD COLUMN IF NOT EXISTS media_type VARCHAR(20)
                """
            )
        )

    print("SUCCESS: deliverables.media_type is ready.")


if __name__ == "__main__":
    add_deliverable_media_type()