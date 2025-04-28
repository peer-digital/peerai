"""
Seed script for the App Store.
This script adds some initial apps to the database.
"""
import sys
import os

# Add the parent directory to the path so we can import from backend
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy.orm import Session
from backend.database import SessionLocal, engine
from backend.models.ai_apps import AIApp
from backend.models.base import Base

# Create tables if they don't exist
Base.metadata.create_all(bind=engine)

# Sample apps to seed
SAMPLE_APPS = [
    {
        "slug": "document-analyzer",
        "name": "Document Analyzer",
        "description": "Analyze and extract information from documents using AI.",
        "icon_url": "https://via.placeholder.com/300x150?text=Document+Analyzer",
        "app_url": "https://app.peerdigital.se/apps/document-analyzer",
        "tags": ["productivity", "analysis", "documents"],
        "is_active": True,
    },
    {
        "slug": "code-assistant",
        "name": "Code Assistant",
        "description": "Get help with coding tasks and debugging using AI.",
        "icon_url": "https://via.placeholder.com/300x150?text=Code+Assistant",
        "app_url": "https://app.peerdigital.se/apps/code-assistant",
        "tags": ["development", "coding", "productivity"],
        "is_active": True,
    },
    {
        "slug": "content-generator",
        "name": "Content Generator",
        "description": "Generate high-quality content for blogs, social media, and more.",
        "icon_url": "https://via.placeholder.com/300x150?text=Content+Generator",
        "app_url": "https://app.peerdigital.se/apps/content-generator",
        "tags": ["marketing", "content", "creativity"],
        "is_active": True,
    },
    {
        "slug": "translation-tool",
        "name": "Translation Tool",
        "description": "Translate text between multiple languages with high accuracy.",
        "icon_url": "https://via.placeholder.com/300x150?text=Translation+Tool",
        "app_url": "https://app.peerdigital.se/apps/translation-tool",
        "tags": ["language", "translation", "international"],
        "is_active": True,
    },
    {
        "slug": "data-visualizer",
        "name": "Data Visualizer",
        "description": "Create beautiful visualizations from your data.",
        "icon_url": "https://via.placeholder.com/300x150?text=Data+Visualizer",
        "app_url": "https://app.peerdigital.se/apps/data-visualizer",
        "tags": ["data", "visualization", "analytics"],
        "is_active": True,
    },
    {
        "slug": "internal-docs-search",
        "name": "Internal Knowledge Base",
        "description": "Quickly find answers from your company's internal documentation and knowledge base using AI-powered search.",
        "icon_url": "https://via.placeholder.com/300x150?text=Internal+Knowledge+Base",
        "app_url": "https://app.peerdigital.se/apps/internal-docs-search",
        "tags": ["documentation", "knowledge", "search", "enterprise"],
        "is_active": True,
    },
]


def seed_app_store():
    """Seed the app store with sample apps."""
    db = SessionLocal()
    try:
        # Check if there are already apps in the database
        existing_apps = db.query(AIApp).count()
        if existing_apps > 0:
            print(f"Found {existing_apps} existing apps. Skipping seeding.")
            return

        # Add sample apps
        for app_data in SAMPLE_APPS:
            app = AIApp(**app_data)
            db.add(app)

        db.commit()
        print(f"Successfully added {len(SAMPLE_APPS)} sample apps to the database.")
    except Exception as e:
        db.rollback()
        print(f"Error seeding app store: {e}")
    finally:
        db.close()


if __name__ == "__main__":
    seed_app_store()
