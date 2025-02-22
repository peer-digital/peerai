#!/usr/bin/env python3
"""
Script to create test users for development and testing.
"""

from backend.database import get_db, engine
from backend.models.user import User
from backend.models.base import Base
from backend.core.security import get_password_hash
from sqlalchemy.orm import Session

# Test users configuration
TEST_USERS = [
    {
        "email": "super.admin@peerai.se",
        "password": "admin123",
        "is_superuser": True,
        "is_active": True,
    },
    {
        "email": "manager@peerai.se",
        "password": "testpass123",
        "is_superuser": False,
        "is_active": True,
    },
    {
        "email": "admin@peerai.se",
        "password": "admin123",
        "is_superuser": False,
        "is_active": True,
    },
]

def create_test_users(db: Session):
    """Create test users in the database."""
    for user_data in TEST_USERS:
        # Check if user already exists
        existing_user = db.query(User).filter(User.email == user_data["email"]).first()
        if existing_user:
            print(f"User {user_data['email']} already exists, skipping...")
            continue
        
        # Create new user
        hashed_password = get_password_hash(user_data["password"])
        user = User(
            email=user_data["email"],
            hashed_password=hashed_password,
            is_superuser=user_data["is_superuser"],
            is_active=user_data["is_active"],
        )
        db.add(user)
        print(f"Created user: {user_data['email']}")
    
    db.commit()
    print("Test users created successfully!")

def main():
    """Main function to create test users."""
    # Create tables if they don't exist
    Base.metadata.create_all(bind=engine)
    
    # Get database session
    db = next(get_db())
    
    try:
        create_test_users(db)
    finally:
        db.close()

if __name__ == "__main__":
    main() 