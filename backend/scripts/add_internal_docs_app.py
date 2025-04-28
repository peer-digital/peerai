"""
Script to add the Internal Knowledge Base app to the existing database.
"""
import sys
import os

# Add the parent directory to the path so we can import from backend
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.database import SessionLocal, engine
from backend.models.ai_apps import AIApp
from backend.models.base import Base

# Create tables if they don't exist
Base.metadata.create_all(bind=engine)

# Internal Knowledge Base app data
INTERNAL_DOCS_APP = {
    "slug": "internal-docs-search",
    "name": "Internal Knowledge Base",
    "description": "Quickly find answers from your company's internal documentation and knowledge base using AI-powered search.",
    "icon_url": "https://via.placeholder.com/300x150?text=Internal+Knowledge+Base",
    "app_url": "https://app.peerdigital.se/apps/internal-docs-search",
    "tags": ["documentation", "knowledge", "search", "enterprise"],
    "is_active": True,
}


def add_internal_docs_app():
    """Add the Internal Knowledge Base app to the database."""
    db = SessionLocal()
    try:
        # Check if the app already exists
        existing_app = db.query(AIApp).filter(AIApp.slug == INTERNAL_DOCS_APP["slug"]).first()
        if existing_app:
            print(f"App with slug '{INTERNAL_DOCS_APP['slug']}' already exists. Skipping.")
            return

        # Add the new app
        app = AIApp(**INTERNAL_DOCS_APP)
        db.add(app)
        db.commit()
        print(f"Successfully added '{INTERNAL_DOCS_APP['name']}' app to the database.")
    except Exception as e:
        db.rollback()
        print(f"Error adding app: {e}")
    finally:
        db.close()


if __name__ == "__main__":
    add_internal_docs_app()
