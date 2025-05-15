"""
Script to add the icon_type column to the app_templates table.
"""
import sys
import os

# Add the parent directory to the path so we can import from backend
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import text
from backend.database import SessionLocal, engine

def add_icon_type_column():
    """Add the icon_type column to the app_templates table."""
    try:
        with engine.connect() as conn:
            conn.execute(text("ALTER TABLE app_templates ADD COLUMN IF NOT EXISTS icon_type VARCHAR"))
            conn.commit()
            print("Successfully added icon_type column to app_templates table.")
    except Exception as e:
        print(f"Error adding icon_type column: {e}")

if __name__ == "__main__":
    add_icon_type_column()
