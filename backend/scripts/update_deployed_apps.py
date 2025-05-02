"""
Script to update all deployed RAG chatbot apps with the latest template.
"""
import os
import sys
from pathlib import Path

# Add the parent directory to the path so we can import from backend
sys.path.append(str(Path(__file__).parent.parent.parent))

from backend.database import get_db
from backend.models.deployed_apps import DeployedApp
from backend.models.app_templates import AppTemplate
from backend.utils.template_helpers import replace_placeholders


def update_all_rag_apps():
    """Update all deployed RAG chatbot apps with the latest template."""
    # Get a database session
    db = next(get_db())

    try:
        # Find the RAG chatbot template
        rag_template = db.query(AppTemplate).filter(
            AppTemplate.slug == "rag-chatbot"
        ).first()

        if not rag_template:
            print("RAG chatbot template not found.")
            return

        print(f"Found RAG chatbot template with ID: {rag_template.id}")

        # Get all apps using this template
        rag_apps = db.query(DeployedApp).filter(
            DeployedApp.template_id == rag_template.id,
            DeployedApp.is_active.is_(True)
        ).all()

        print(f"Found {len(rag_apps)} active RAG chatbot apps to update")

        # Get the RAG chatbot template
        template_path = os.path.join(os.path.dirname(__file__), "rag-chatbot-template.html")

        with open(template_path, "r") as f:
            template_code = f.read()

        # Update each app
        for app in rag_apps:
            print(f"Updating app: {app.name} (ID: {app.id}, Slug: {app.slug})")

            try:
                # Get the app's configuration
                config = app.configuration or {}

                # Add app_id to the configuration
                config['app_id'] = app.id
                config['app_slug'] = app.slug

                # Generate the app HTML by replacing placeholders in the template
                app_html = replace_placeholders(template_code, config)

                # Update the app's custom_code with the new HTML
                app.custom_code = app_html
                db.commit()

                # Also save the app HTML to a file for direct access
                app_dir = os.path.join(os.getcwd(), "apps")
                os.makedirs(app_dir, exist_ok=True)

                app_path = os.path.join(app_dir, f"{app.slug}.html")
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
    update_all_rag_apps()
