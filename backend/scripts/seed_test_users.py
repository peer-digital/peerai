#!/usr/bin/env python3
"""
Script to seed test users for development and testing.
Creates one user for each role defined in the RBAC system.
"""
import os
import sys

# Add parent directory to Python path
sys.path.append(
    os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
)

from backend.database import SessionLocal
from backend.models.auth import User
from backend.models.base import Base
from backend.core.security import get_password_hash
from sqlalchemy.orm import Session

# Test users configuration - one user per role
TEST_USERS = [
    {
        "email": "guest@peerdigital.se",
        "password": "guest123",
        "full_name": "Guest User",
        "role": "GUEST",  # Use string values that match the database enum
        "is_active": True,
    },
    {
        "email": "user@peerdigital.se",
        "password": "user123",
        "full_name": "Regular User",
        "role": "USER",
        "is_active": True,
    },
    {
        "email": "team.admin@peerdigital.se",
        "password": "teamadmin123",
        "full_name": "Team Admin",
        "role": "USER_ADMIN",  # USER_ADMIN is used for team admins
        "is_active": True,
    },
    {
        "email": "content.manager@peerdigital.se",
        "password": "content123",
        "full_name": "Content Manager",
        "role": "CONTENT_MANAGER",
        "is_active": True,
    },
    {
        "email": "super.admin@peerdigital.se",
        "password": "superadmin123",
        "full_name": "Super Admin",
        "role": "SUPER_ADMIN",
        "is_active": True,
    },
]


def seed_test_users(db: Session):
    """Seed test users in the database if they don't exist."""
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
    """Main function to seed test users."""
    try:
        # Get database session
        db = SessionLocal()
        try:
            # Check if there are already users in the database
            existing_users = db.query(User).count()
            if existing_users > 0:
                print(f"Found {existing_users} existing users.")
                print("Proceeding to create test users if they don't exist...")

            seed_test_users(db)
        finally:
            db.close()

    except Exception as e:
        print(f"\nError: {str(e)}")
        sys.exit(1)


if __name__ == "__main__":
    main()
