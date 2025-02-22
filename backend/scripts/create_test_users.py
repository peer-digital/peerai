#!/usr/bin/env python3
"""
Script to create test users for development and testing.
"""
import os
import sys

# Add parent directory to Python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from backend.database import engine
from backend.models.auth import User
from backend.models.base import Base
from backend.core.security import get_password_hash
from sqlalchemy.orm import Session

# Test users configuration
TEST_USERS = [
    {
        "email": "super.admin@peerai.se",
        "password": "admin123",
        "full_name": "Super Admin",
        "is_superuser": True,
        "is_active": True,
    },
    {
        "email": "manager@peerai.se",
        "password": "testpass123",
        "full_name": "Test Manager",
        "is_superuser": False,
        "is_active": True,
    },
    {
        "email": "admin@peerai.se",
        "password": "admin123",
        "full_name": "Test Admin",
        "is_superuser": True,
        "is_active": True,
    },
]

def create_test_users(db: Session):
    """Create test users in the database."""
    created_count = 0
    skipped_count = 0
    
    # First, delete all existing users
    db.query(User).delete()
    db.commit()
    print("Deleted all existing users")
    
    for user_data in TEST_USERS:
        # Create new user
        hashed_password = get_password_hash(user_data["password"])
        user = User(
            email=user_data["email"],
            hashed_password=hashed_password,
            full_name=user_data["full_name"],
            is_superuser=user_data["is_superuser"],
            is_active=user_data["is_active"],
        )
        db.add(user)
        print(f"Created user: {user_data['email']}")
        created_count += 1
    
    db.commit()
    print(f"\nSummary:")
    print(f"- Created: {created_count} users")
    print(f"- Total: {len(TEST_USERS)} users")

def main():
    """Main function to create test users."""
    try:
        # Create tables if they don't exist
        Base.metadata.create_all(bind=engine)
        
        # Get database session
        db = Session(engine)
        try:
            create_test_users(db)
        finally:
            db.close()
            
    except Exception as e:
        print(f"\nError: {str(e)}")
        sys.exit(1)

if __name__ == "__main__":
    main() 