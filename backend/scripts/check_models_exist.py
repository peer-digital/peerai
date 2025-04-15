#!/usr/bin/env python
"""
Script to check if models exist in the database.
Returns exit code 0 if models exist, 1 if no models exist.

Usage:
    python -m backend.scripts.check_models_exist
"""

import os
import sys
from pathlib import Path
from dotenv import load_dotenv
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy import create_engine, text

# --- Load DATABASE_URL first ---
# Load .env file if it exists
dotenv_path = Path(__file__).parent.parent / ".env"
load_dotenv(dotenv_path)

# Explicitly get DATABASE_URL from environment
DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    # Fallback to the default from config if not set in env
    try:
        # Temporarily import just the setting
        from backend.config import settings
        DATABASE_URL = settings.DATABASE_URL
        print("Warning: DATABASE_URL not found in environment, using default from config.")
    except ImportError:
        print("Error: Cannot determine DATABASE_URL. Set it in the environment or ensure backend.config is available.")
        sys.exit(1)
# --- End DATABASE_URL loading ---

# Add the parent directory to sys.path AFTER potentially loading DATABASE_URL
sys.path.insert(0, str(Path(__file__).parent.parent))

# --- Database Setup using explicit DATABASE_URL ---
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
# --- End Database Setup ---

def check_models_exist():
    """Check if any models exist in the database."""
    db = SessionLocal()
    try:
        # Verify connection
        db.execute(text("SELECT 1"))

        # Check if any models exist
        result = db.execute(text("SELECT COUNT(*) FROM ai_models"))
        count = result.scalar()

        if count > 0:
            print(f"Found {count} models in the database.")
            return True
        else:
            print("No models found in the database.")
            return False
    except Exception as e:
        print(f"Error checking models: {str(e)}")
        # If there's an error (like table doesn't exist), assume no models
        return False
    finally:
        db.close()

if __name__ == "__main__":
    models_exist = check_models_exist()
    # Exit with code 0 if models exist, 1 if no models exist
    sys.exit(0 if models_exist else 1)
