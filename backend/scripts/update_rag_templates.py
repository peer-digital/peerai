"""
Script to update all deployed RAG chatbot apps with the latest template.
"""
import os
import sys
import argparse
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from pathlib import Path

# Add the parent directory to the path so we can import from backend
sys.path.append(str(Path(__file__).parent.parent.parent))

from backend.database import get_db
from backend.models.deployed_apps import DeployedApp
from backend.services.app_generator import AppGenerator


def update_all_rag_apps():
    """Update all deployed RAG chatbot apps with the latest template."""
    # Get a database session
    db = next(get_db())
    
    try:
        # Get all active RAG chatbot apps
        rag_apps = db.query(DeployedApp).filter(
            DeployedApp.app_type == "rag-chatbot",
            DeployedApp.is_active.is_(True)
        ).all()
        
        print(f"Found {len(rag_apps)} active RAG chatbot apps to update")
        
        # Initialize the app generator
        app_generator = AppGenerator()
        
        # Update each app
        for app in rag_apps:
            print(f"Updating app: {app.name} (ID: {app.id}, Slug: {app.slug})")
            
            try:
                # Generate the app HTML
                app_html = app_generator.generate_rag_chatbot(
                    app_id=app.id,
                    app_name=app.name,
                    app_slug=app.slug,
                    model=app.model,
                    system_prompt=app.system_prompt,
                    temperature=app.temperature,
                    api_key=app.api_key,
                    theme=app.theme,
                    custom_css=app.custom_css,
                    custom_js=app.custom_js,
                    custom_html=app.custom_html,
                    content=app.content
                )
                
                # Save the app HTML to the app's file
                app_path = f"apps/{app.slug}.html"
                with open(app_path, "w") as f:
                    f.write(app_html)
                
                print(f"Successfully updated app: {app.slug}")
                
            except Exception as e:
                print(f"Error updating app {app.slug}: {str(e)}")
        
        print("All apps updated successfully")
        
    except Exception as e:
        print(f"Error updating apps: {str(e)}")
    finally:
        db.close()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Update all deployed RAG chatbot apps with the latest template")
    args = parser.parse_args()
    
    update_all_rag_apps()
