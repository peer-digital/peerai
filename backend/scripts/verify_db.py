import os
import sys
from pathlib import Path

# Add the parent directory to PYTHONPATH
sys.path.append(str(Path(__file__).parent.parent))

from sqlalchemy import create_engine, inspect
from sqlalchemy.orm import sessionmaker

from config import settings
from models import User, SystemSettings

def verify_database():
    """Verify database tables and content."""
    engine = create_engine(settings.DATABASE_URL)
    inspector = inspect(engine)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = SessionLocal()

    try:
        # Check tables
        tables = inspector.get_table_names()
        print("\nExisting tables:", tables)

        # Check users
        users = db.query(User).all()
        print("\nUsers:")
        for user in users:
            print(f"- {user.email} (superuser: {user.is_superuser})")

        # Check system settings
        settings = db.query(SystemSettings).all()
        print("\nSystem Settings:")
        for setting in settings:
            print(f"- ID: {setting.id}")
            print(f"  Rate Limit: {setting.rate_limit}")
            print(f"  Models: {setting.models}")

    except Exception as e:
        print(f"\nError: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    verify_database() 