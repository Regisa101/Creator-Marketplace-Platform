from sqlalchemy import inspect, text

from app.database import engine


OLD_COLUMNS = [
    "tagline",
    "brief",
    "sub_category",
    "brand_name",
    "brand_location",
    "before_you_apply",
    "checklist",
    "required_scenes",
    "video_specs",
    "dos",
    "donts",
    "suggested_caption",
    "hashtags",
    "guidelines_note",
    "completion_mode",
    "required_platform",
    "required_post_type",
    "required_platforms",
    "required_post_types",
    "publication_deadline",
    "required_mentions",
    "funding_status",
    "funded_amount",
    "funded_at",
    "deliverable_deadline",
    "extra_photos",
]


NEW_COLUMNS = {
    "responsibilities": "TEXT",
    "creator_types": "JSON",
    "experience_level": "VARCHAR(50)",
    "required_skills": "JSON",
    "location": "VARCHAR(255)",
    "work_arrangement": "VARCHAR(30)",
    "engagement_type": "VARCHAR(30)",
    "duration": "VARCHAR(100)",
    "pricing_model": "VARCHAR(30)",
    "compensation_type": "VARCHAR(30)",
    "budget_min": "DECIMAL(12,2)",
    "budget_max": "DECIMAL(12,2)",
    "start_date": "TIMESTAMP WITH TIME ZONE",
    "end_date": "TIMESTAMP WITH TIME ZONE",
}


def main() -> None:
    inspector = inspect(engine)

    tables = inspector.get_table_names()

    if "campaigns" not in tables:
        print("campaigns table does not exist.")
        return

    existing_columns = {
        column["name"]
        for column in inspector.get_columns("campaigns")
    }

    with engine.begin() as connection:

        # --------------------------------------------------------
        # Add new columns
        # --------------------------------------------------------

        for column_name, column_type in NEW_COLUMNS.items():
            if column_name not in existing_columns:
                print(f"Adding campaigns.{column_name} ...")

                connection.execute(
                    text(
                        f"ALTER TABLE campaigns "
                        f"ADD COLUMN {column_name} {column_type}"
                    )
                )

        # --------------------------------------------------------
        # Remove old columns
        # --------------------------------------------------------

        for column_name in OLD_COLUMNS:
            if column_name in existing_columns:
                print(f"Removing campaigns.{column_name} ...")

                connection.execute(
                    text(
                        f"ALTER TABLE campaigns "
                        f"DROP COLUMN IF EXISTS {column_name}"
                    )
                )

    print()
    print("Campaign database cleanup completed successfully.")


if __name__ == "__main__":
    main()