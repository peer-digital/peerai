from sqlalchemy.orm import Session
import sys
import os

# Add parent directory to Python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from api.database import get_db, engine
from api.models.auth import User
from api.routes.auth import get_password_hash
from api.models.base import Base

def create_test_user():
    """Create test user for development"""
    # Create tables if they don't exist
    Base.metadata.create_all(bind=engine)
    
    # Get database session
    db = Session(engine)
    
    # Check if test user already exists
    test_user = db.query(User).filter(User.email == "admin@peerai.se").first()
    if test_user:
        print("Test user already exists")
        return
    
    # Create test user
    test_user = User(
        email="admin@peerai.se",
        hashed_password=get_password_hash("admin123"),
        full_name="Test Admin",
        is_active=True,
        is_superuser=True
    )
    
    db.add(test_user)
    db.commit()
    print("Test user created successfully")

if __name__ == "__main__":
    create_test_user() 