"""
DATABASE MIGRATION SCRIPT
Run this to create all tables in PostgreSQL
"""

from app.database import engine, Base
from app.models import (
    User,
    CreatorProfile,
    BusinessProfile,
    CreatorSocial,
    Campaign,
    Application,
    SavedCampaign
)

print("=" * 50)
print("🔄 Starting Database Migration...")
print("=" * 50)

try:
    # Create all tables
    Base.metadata.create_all(bind=engine)
    print("✅ All tables created successfully!")
    
    # Verify tables exist
    from sqlalchemy import inspect
    inspector = inspect(engine)
    tables = inspector.get_table_names()
    
    print("\n📊 Tables in database:")
    for table in tables:
        print(f"   - {table}")
    
    print("\n" + "=" * 50)
    print("✅ Migration complete!")
    
except Exception as e:
    print(f"❌ Error: {e}")