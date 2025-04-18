#!/usr/bin/env python
"""
Script to add the default_api_key_id column to the users table.
"""
import sys
import os
from sqlalchemy import text

# Add the parent directory to the Python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import engine

def add_default_api_key_column():
    """Add the default_api_key_id column to the users table."""
    try:
        # Check if the column already exists using raw SQL
        with engine.connect() as conn:
            # Check if column exists
            result = conn.execute(text(
                """SELECT column_name FROM information_schema.columns
                   WHERE table_name='users' AND column_name='default_api_key_id'"""
            ))
            column_exists = result.fetchone() is not None

            if not column_exists:
                print("Adding default_api_key_id column to users table...")

                # Add the column
                conn.execute(text(
                    "ALTER TABLE users ADD COLUMN default_api_key_id INTEGER REFERENCES api_keys(id)"
                ))
                conn.commit()

                print("Column added successfully.")

                # Set default API keys for existing users using raw SQL
                # First get all users
                users_result = conn.execute(text("SELECT id FROM users"))
                users = users_result.fetchall()
                updated_count = 0

                for user_row in users:
                    user_id = user_row[0]

                    # Find the most recently used API key for this user
                    api_key_result = conn.execute(text(
                        """SELECT id FROM api_keys
                           WHERE user_id = :user_id AND is_active = TRUE
                           ORDER BY last_used_at DESC NULLS LAST LIMIT 1"""
                    ), {"user_id": user_id})

                    api_key = api_key_result.fetchone()

                    # If no recently used key, try to find any active key
                    if not api_key:
                        api_key_result = conn.execute(text(
                            """SELECT id FROM api_keys
                               WHERE user_id = :user_id AND is_active = TRUE
                               LIMIT 1"""
                        ), {"user_id": user_id})
                        api_key = api_key_result.fetchone()

                    if api_key:
                        # Update the user's default API key
                        conn.execute(text(
                            """UPDATE users SET default_api_key_id = :api_key_id
                               WHERE id = :user_id"""
                        ), {"api_key_id": api_key[0], "user_id": user_id})
                        updated_count += 1

                if updated_count > 0:
                    conn.commit()
                    print(f"Set default API keys for {updated_count} users.")
                else:
                    print("No users needed default API keys set.")
            else:
                print("Column default_api_key_id already exists in users table.")
    except Exception as e:
        print(f"Error adding default_api_key_id column: {e}")


if __name__ == "__main__":
    add_default_api_key_column()
