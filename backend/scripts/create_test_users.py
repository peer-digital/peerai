#!/usr/bin/env python3
"""
Script to create test users for development and testing.
"""
import os
import sys

# Add parent directory to Python path
sys.path.append(
    os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
)

from backend.database import engine
from backend.models.auth import User
from backend.models.base import Base
from backend.core.security import get_password_hash
from backend.core.roles import Role
from sqlalchemy.orm import Session

# Test users configuration
TEST_USERS = [
    {
        "email": "user@peerai.se",
        "password": "user123",
        "full_name": "Regular User",
        "role": Role.USER,
        "is_active": True,
    },
    {
        "email": "admin@peerai.se",
        "password": "admin123",
        "full_name": "Team Admin",
        "role": Role.USER_ADMIN,
        "is_active": True,
    },
    {
        "email": "super.admin@peerai.se",
        "password": "superadmin123",
        "full_name": "Super Admin",
        "role": Role.SUPER_ADMIN,
        "is_active": True,
    },
]


def create_test_users(db: Session):
    """Create test users in the database if they don't exist."""
    created_count = 0
    skipped_count = 0

    for user_data in TEST_USERS:
        # Check if user already exists
        existing_user = db.query(User).filter(User.email == user_data["email"]).first()

        if existing_user:
            print(f"Skipped existing user: {user_data['email']}")
            skipped_count += 1
            continue

        # Create new user
        hashed_password = get_password_hash(user_data["password"])
        user = User(
            email=user_data["email"],
            hashed_password=hashed_password,
            full_name=user_data["full_name"],
            role=user_data["role"],
            is_active=user_data["is_active"],
        )
        db.add(user)
        print(f"Created user: {user_data['email']} with role: {user_data['role']}")
        created_count += 1

    db.commit()
    print("\nSummary:")
    print(f"- Created: {created_count} users")
    print(f"- Skipped: {skipped_count} existing users")
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
