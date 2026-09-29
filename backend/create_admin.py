from app.database import SessionLocal
from app.models import User
from app.auth import hash_password


ADMIN_EMAIL = "admin@creatorhub.com"
ADMIN_PASSWORD = "Admin123!"
ADMIN_NAME = "CreatorHub Admin"


def create_admin():
    db = SessionLocal()

    try:
        # Do not modify an existing account.
        existing_user = (
            db.query(User)
            .filter(User.email == ADMIN_EMAIL)
            .first()
        )

        if existing_user:
            print(f"\nAn account already exists with: {ADMIN_EMAIL}")
            print(f"Current role: {existing_user.role}")
            print("No changes were made to your database.")
            return

        # Create a completely new admin account.
        admin = User(
            email=ADMIN_EMAIL,
            full_name=ADMIN_NAME,
            password=hash_password(ADMIN_PASSWORD),
            role="admin",
            is_active=True,
        )

        db.add(admin)
        db.commit()
        db.refresh(admin)

        print("\n======================================")
        print("ADMIN ACCOUNT CREATED SUCCESSFULLY")
        print("======================================")
        print(f"Email:    {ADMIN_EMAIL}")
        print(f"Password: {ADMIN_PASSWORD}")
        print(f"Role:     {admin.role}")
        print("======================================")
        print("\nExisting users/data were not modified.")

    except Exception as e:
        db.rollback()
        print("\nFailed to create admin account.")
        print(f"Error: {e}")

    finally:
        db.close()


if __name__ == "__main__":
    create_admin()