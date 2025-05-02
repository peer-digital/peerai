"""
Script to seed the RAG Chatbot template.
"""
import os
import sys
import json
import argparse
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

# Add the parent directory to the path so we can import backend modules
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

from backend.database import SessionLocal
from backend.models.app_templates import AppTemplate


def seed_rag_chatbot_template(force_update=False):
    """
    Seed the RAG Chatbot template.

    Args:
        force_update: If True, update the template if it already exists.
    """
    db = SessionLocal()

    try:
        # Check if template already exists
        existing_template = db.query(AppTemplate).filter(
            AppTemplate.slug == "rag-chatbot"
        ).first()

        if existing_template and not force_update:
            print("RAG Chatbot template already exists. Use --force-update to update it.")
            return

        # Load template configuration
        script_dir = os.path.dirname(os.path.abspath(__file__))
        config_path = os.path.join(script_dir, "rag-chatbot-template-config.json")
        template_path = os.path.join(script_dir, "rag-chatbot-template.html")

        with open(config_path, "r") as f:
            template_config = json.load(f)

        with open(template_path, "r") as f:
            template_code = f.read()

        # Create or update template
        if existing_template and force_update:
            existing_template.name = "RAG Chatbot"
            existing_template.description = "An advanced chatbot that can answer questions based on your uploaded documents."
            existing_template.icon_url = "/icons/rag-chatbot-icon.svg"  # Update with actual icon path
            existing_template.template_config = template_config
            existing_template.template_code = template_code
            existing_template.tags = ["chatbot", "rag", "documents", "ai"]
            db.commit()
            print("RAG Chatbot template updated successfully.")
        else:
            new_template = AppTemplate(
                slug="rag-chatbot",
                name="RAG Chatbot",
                description="An advanced chatbot that can answer questions based on your uploaded documents.",
                icon_url="/icons/rag-chatbot-icon.svg",  # Update with actual icon path
                template_config=template_config,
                template_code=template_code,
                tags=["chatbot", "rag", "documents", "ai"],
                is_active=True
            )
            db.add(new_template)
            db.commit()
            print("RAG Chatbot template created successfully.")

    except IntegrityError as e:
        db.rollback()
        print(f"Error: {e}")
    except Exception as e:
        db.rollback()
        print(f"Error: {e}")
    finally:
        db.close()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Seed the RAG Chatbot template")
    parser.add_argument(
        "--force-update",
        action="store_true",
        help="Update the template if it already exists",
    )
    args = parser.parse_args()

    seed_rag_chatbot_template(force_update=args.force_update)
