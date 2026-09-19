from sqlalchemy import inspect, text

from app.database import engine


def main() -> None:
    inspector = inspect(engine)
    if "business_profiles" not in inspector.get_table_names():
        print("business_profiles table does not exist yet; no migration needed.")
        return

    columns = {column["name"] for column in inspector.get_columns("business_profiles")}
    if "social_links" in columns:
        print("business_profiles.social_links already exists; no migration needed.")
        return

    with engine.begin() as connection:
        connection.execute(text("ALTER TABLE business_profiles ADD COLUMN social_links JSON"))

    print("business_profiles.social_links is ready.")


if __name__ == "__main__":
    main()
