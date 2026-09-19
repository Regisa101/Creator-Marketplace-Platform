from sqlalchemy import inspect, text

from app.database import engine


def main() -> None:
    inspector = inspect(engine)
    if "creator_profiles" not in inspector.get_table_names():
        print("creator_profiles table does not exist yet; no migration needed.")
        return

    columns = {column["name"] for column in inspector.get_columns("creator_profiles")}
    if "creator_type" not in columns:
        print("creator_type column does not exist; no migration needed.")
        return

    with engine.begin() as connection:
        connection.execute(text(
            "ALTER TABLE creator_profiles ALTER COLUMN creator_type TYPE VARCHAR(255)"
        ))

    print("creator_profiles.creator_type is now VARCHAR(255).")


if __name__ == "__main__":
    main()
