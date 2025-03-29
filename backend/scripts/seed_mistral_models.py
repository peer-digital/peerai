#!/usr/bin/env python
"""
Script to fetch available models from Mistral AI API and seed them into the database.
This ensures the model list in the API playground is populated correctly.

Usage:
    python -m backend.scripts.seed_mistral_models
"""

import os
import sys
import requests
from pathlib import Path
from dotenv import load_dotenv
from sqlalchemy.orm import Session

# Add the parent directory to sys.path to allow importing modules
sys.path.insert(0, str(Path(__file__).parent.parent))

from database import SessionLocal
from models.models import ModelProvider, AIModel


def load_env_variables():
    """Load environment variables from .env file"""
    dotenv_path = Path(__file__).parent.parent / ".env"
    load_dotenv(dotenv_path)
    return {
        "api_key": os.getenv("EXTERNAL_LLM_API_KEY"),
        "api_url": os.getenv("EXTERNAL_LLM_URL", "https://api.mistral.ai/v1/chat/completions")
    }


def fetch_mistral_models(api_key):
    """Fetch available models from Mistral AI API"""
    url = "https://api.mistral.ai/v1/models"
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
        "Accept": "application/json"
    }
    
    response = requests.get(url, headers=headers)
    if response.status_code != 200:
        print(f"Error fetching models: {response.status_code}, {response.text}")
        return None
    
    return response.json().get("data", [])


def get_or_create_mistral_provider(db: Session):
    """Get or create the Mistral provider in the database"""
    provider = db.query(ModelProvider).filter(ModelProvider.name == "mistral").first()
    
    if not provider:
        print("Creating Mistral provider...")
        provider = ModelProvider(
            name="mistral",
            display_name="Mistral AI",
            api_base_url="https://api.mistral.ai/v1/chat/completions",
            api_key_env_var="EXTERNAL_LLM_API_KEY",
            is_active=True,
            config={"request_format": "chat"}
        )
        db.add(provider)
        db.commit()
        db.refresh(provider)
        print(f"Created Mistral provider with ID: {provider.id}")
    else:
        print(f"Found existing Mistral provider with ID: {provider.id}")
    
    return provider


def seed_mistral_models(db: Session, provider, models):
    """Seed Mistral models into the database"""
    if not models:
        print("No models to seed")
        return
    
    # Default model flags - first model of each type will be set as default
    default_models = {}
    
    for model_data in models:
        model_id = model_data.get("id")
        # Skip if no id is present
        if not model_id:
            continue
            
        # Extract model display name - usually like "mistral-tiny-latest"
        display_name = model_id.replace("-latest", "").title().replace("-", " ")
        
        # Determine model type based on capabilities
        model_type = "text"  # Default to text
        
        # Check if model already exists
        existing_model = db.query(AIModel).filter(
            AIModel.name == model_id,
            AIModel.provider_id == provider.id
        ).first()
        
        if existing_model:
            print(f"Model '{model_id}' already exists, updating...")
            existing_model.display_name = display_name
            existing_model.status = "active"
            existing_model.config = {
                "api_model_id": model_id,
                "description": model_data.get("description", "")
            }
            
            if model_type not in default_models and existing_model.is_default:
                default_models[model_type] = True
                
            db.commit()
        else:
            print(f"Creating new model '{model_id}'...")
            
            # Check if this should be the default model for its type
            is_default = model_type not in default_models
            if is_default:
                default_models[model_type] = True
            
            # Create the model
            new_model = AIModel(
                name=model_id,
                display_name=display_name,
                provider_id=provider.id,
                model_type=model_type,
                capabilities=["chat", "completion"],
                status="active",
                is_default=is_default,
                cost_per_1k_input_tokens=0.0,  # Set appropriate cost if available
                cost_per_1k_output_tokens=0.0,  # Set appropriate cost if available
                config={
                    "api_model_id": model_id,
                    "description": model_data.get("description", "")
                }
            )
            
            db.add(new_model)
            db.commit()
    
    print(f"Successfully seeded {len(models)} Mistral models")


def main():
    """Main function to run the script"""
    # Load environment variables
    env = load_env_variables()
    api_key = env["api_key"]
    
    if not api_key:
        print("Error: EXTERNAL_LLM_API_KEY not found in .env file")
        return
    
    # Fetch models from Mistral API
    print("Fetching models from Mistral API...")
    models = fetch_mistral_models(api_key)
    
    if not models:
        print("No models received from Mistral API")
        return
    
    print(f"Received {len(models)} models from Mistral API")
    
    # Connect to database
    db = SessionLocal()
    try:
        # Get or create Mistral provider
        provider = get_or_create_mistral_provider(db)
        
        # Seed models
        seed_mistral_models(db, provider, models)
        
        print("Model seeding completed successfully")
    except Exception as e:
        print(f"Error: {str(e)}")
    finally:
        db.close()


if __name__ == "__main__":
    main() 