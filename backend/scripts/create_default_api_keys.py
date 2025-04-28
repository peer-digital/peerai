#!/usr/bin/env python
"""
Script to create default API keys for all users who don't have one.
"""
import sys
import os
import secrets
from pathlib import Path
from datetime import datetime, timedelta, timezone

# Add the parent directory to PYTHONPATH
current_dir = Path(__file__).parent.parent
sys.path.insert(0, str(current_dir))

from sqlalchemy.orm import Session
from models.auth import User, APIKey
from database import SessionLocal


def create_default_api_keys():
    """Create default API keys for users who don't have any."""
    db = SessionLocal()
    try:
        # Get all users
        users = db.query(User).all()
        created_count = 0
        skipped_count = 0

        for user in users:
            # Check if user already has API keys
            existing_keys = db.query(APIKey).filter(APIKey.user_id == user.id).count()
            
            if existing_keys > 0:
                print(f"User {user.email} already has {existing_keys} API key(s). Skipping.")
                skipped_count += 1
                continue
            
            # Create a default API key for the user
            api_key = APIKey(
                key=f"pk_{secrets.token_urlsafe(32)}",
                name=f"Default Key for {user.email}",
                user_id=user.id,
                is_active=True,
                expires_at=datetime.now(timezone.utc) + timedelta(days=365),  # 1 year expiration
                daily_limit=1000,
                minute_limit=60
            )
            db.add(api_key)
            db.commit()
            db.refresh(api_key)
            
            # Set this as the user's default API key
            user.default_api_key_id = api_key.id
            db.commit()
            
            print(f"Created default API key for user {user.email} with ID {api_key.id}")
            created_count += 1
        
        print(f"\nSummary:")
        print(f"- Created: {created_count} default API keys")
        print(f"- Skipped: {skipped_count} users who already had API keys")
        print(f"- Total: {created_count + skipped_count} users processed")
    
    except Exception as e:
        db.rollback()
        print(f"Error creating default API keys: {e}")
    finally:
        db.close()


if __name__ == "__main__":
    create_default_api_keys()
