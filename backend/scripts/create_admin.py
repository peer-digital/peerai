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
from core.roles import Role

# Password hashing configuration
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def create_admin_user():
    """Create admin user if it doesn't exist."""
    engine = create_engine(settings.DATABASE_URL)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = SessionLocal()

    try:
        # Check if super admin user exists
        admin = db.query(User).filter(User.email == "super.admin@peerai.se").first()
        if not admin:
            # Create super admin user
            admin = User(
                email="super.admin@peerai.se",
                hashed_password=pwd_context.hash("superadmin123"),  # Default password
                full_name="Super Admin",
                is_active=True,
                role=Role.SUPER_ADMIN,
            )
            db.add(admin)
            db.commit()
            print("Super admin user created successfully!")
        else:
            print("Super admin user already exists.")
    except Exception as e:
        print(f"Error creating super admin user: {e}")
        db.rollback()
    finally:
        db.close()


if __name__ == "__main__":
    create_admin_user()
