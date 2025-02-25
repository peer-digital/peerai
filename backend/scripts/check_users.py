#!/usr/bin/env python3
"""
Script to check users in the database.
"""
import os
import sys

# Add parent directory to Python path
sys.path.append(
    os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
)

from backend.database import engine
from sqlalchemy import text

def main():
    """Check users in the database."""
    try:
        with engine.connect() as conn:
            result = conn.execute(text('SELECT id, email, role, is_active, hashed_password FROM users'))
            print("Users in the database:")
            print("-" * 80)
            for row in result:
                print(f"ID: {row[0]}, Email: {row[1]}, Role: {row[2]}, Active: {row[3]}")
                print(f"Password hash: {row[4][:20]}...")
                print("-" * 80)
    except Exception as e:
        print(f"Error: {str(e)}")
        sys.exit(1)

if __name__ == "__main__":
    main() 