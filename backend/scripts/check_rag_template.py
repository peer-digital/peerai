"""
Script to check the RAG Chatbot template in the database.
"""
import os
import sys
import json

# Add the parent directory to the path so we can import backend modules
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

from backend.database import SessionLocal
from backend.models.app_templates import AppTemplate


def check_rag_template():
    """
    Check the RAG Chatbot template in the database.
    """
    db = SessionLocal()
    
    try:
        # Check if template exists
        existing_template = db.query(AppTemplate).filter(
            AppTemplate.slug == "rag-chatbot"
        ).first()
        
        if not existing_template:
            print("RAG Chatbot template does not exist. Please run seed_rag_chatbot_template.py first.")
            return
        
        # Print template details
        print(f"Template ID: {existing_template.id}")
        print(f"Template Name: {existing_template.name}")
        print(f"Template Slug: {existing_template.slug}")
        print(f"Template Description: {existing_template.description}")
        print(f"Template Is Active: {existing_template.is_active}")
        
        # Check if template_config is valid JSON
        try:
            if existing_template.template_config:
                # Check schema
                if 'schema' in existing_template.template_config:
                    print("Schema exists in template_config")
                    
                    # Check schema properties
                    if 'properties' in existing_template.template_config['schema']:
                        print("Properties exist in schema")
                        
                        # Count properties
                        properties_count = len(existing_template.template_config['schema']['properties'])
                        print(f"Number of properties: {properties_count}")
                        
                        # List property names
                        property_names = list(existing_template.template_config['schema']['properties'].keys())
                        print(f"Property names: {property_names}")
                    else:
                        print("ERROR: Properties missing in schema")
                else:
                    print("ERROR: Schema missing in template_config")
                
                # Check uiSchema
                if 'uiSchema' in existing_template.template_config:
                    print("uiSchema exists in template_config")
                else:
                    print("ERROR: uiSchema missing in template_config")
                
                # Check default_values
                if 'default_values' in existing_template.template_config:
                    print("default_values exists in template_config")
                else:
                    print("ERROR: default_values missing in template_config")
            else:
                print("ERROR: template_config is None")
        except Exception as e:
            print(f"ERROR: Failed to parse template_config: {e}")
        
    except Exception as e:
        print(f"Error: {e}")
    finally:
        db.close()


if __name__ == "__main__":
    check_rag_template()
