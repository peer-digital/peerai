import os
import sys
from pathlib import Path

# Add the parent directory to PYTHONPATH
current_dir = Path(__file__).parent.parent
sys.path.insert(0, str(current_dir))

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from passlib.context import CryptContext

from config import settings
from models.auth import User

# Password hashing configuration
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def create_admin_user():
    """Create admin user if it doesn't exist."""
    engine = create_engine(settings.DATABASE_URL)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = SessionLocal()

    try:
        # Check if admin user exists
        admin = db.query(User).filter(User.email == "admin@peerai.se").first()
        if not admin:
            # Create admin user
            admin = User(
                email="admin@peerai.se",
                hashed_password=pwd_context.hash("admin123"),  # Default password
                full_name="Admin User",
                is_active=True,
                is_superuser=True
            )
            db.add(admin)
            db.commit()
            print("Admin user created successfully!")
        else:
            print("Admin user already exists.")
    except Exception as e:
        print(f"Error creating admin user: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    create_admin_user() 