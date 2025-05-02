#!/usr/bin/env python
"""
Script to check the templates in the database.
"""
import os
import sys

# Add the parent directory to the path so we can import backend modules
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

from backend.database import SessionLocal
from backend.models.app_templates import AppTemplate


def check_templates():
    """Check the templates in the database."""
    db = SessionLocal()
    try:
        templates = db.query(AppTemplate).all()
        
        if not templates:
            print("No templates found in the database.")
            return
        
        print(f"Found {len(templates)} templates in the database:")
        for template in templates:
            print(f"  - {template.name} (ID: {template.id}, slug: {template.slug})")
            
    except Exception as e:
        print(f"Error checking templates: {e}")
    finally:
        db.close()


if __name__ == "__main__":
    check_templates()
