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
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy import create_engine
from sqlalchemy import text

# Define models that should always be active or inactive
# These models will not be deactivated by the seed_mistral_models script
ALWAYS_ACTIVE_MODELS = [
    "mistral-large-latest",
    "mistral-medium-latest",
    "mistral-small-latest",
    "open-mistral-nemo-2407",
    "pixtral-large-2411"
]

# Models that should always be inactive
ALWAYS_INACTIVE_MODELS = []

# Default status for new models not in either list above
DEFAULT_NEW_MODEL_STATUS = "inactive"

# --- Load DATABASE_URL first ---
# Load .env file if it exists, primarily for EXTERNAL_LLM_API_KEY
dotenv_path = Path(__file__).parent.parent / ".env"
load_dotenv(dotenv_path)

# Explicitly get DATABASE_URL from environment
DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    # Fallback to the default from config if not set in env
    try:
        # Temporarily import just the setting
        from backend.config import Settings
        DATABASE_URL = Settings().DATABASE_URL
        print("Warning: DATABASE_URL not found in environment, using default from config.")
    except ImportError:
        print("Error: Cannot determine DATABASE_URL. Set it in the environment or ensure backend.config is available.")
        sys.exit(1)
# --- End DATABASE_URL loading ---

# Add the parent directory to sys.path AFTER potentially loading DATABASE_URL
sys.path.insert(0, str(Path(__file__).parent.parent))

# Now import other backend modules
from models.models import ModelProvider, AIModel

# --- Database Setup using explicit DATABASE_URL ---
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
# --- End Database Setup ---


def load_env_variables():
    """Load environment variables (API Key only now)"""
    # DATABASE_URL is loaded above
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

            # Apply status rules from configuration
            if model_id in ALWAYS_ACTIVE_MODELS:
                if existing_model.status != "active":
                    print(f"  Setting {model_id} to active (in ALWAYS_ACTIVE_MODELS list)")
                    existing_model.status = "active"
            elif model_id in ALWAYS_INACTIVE_MODELS:
                if existing_model.status != "inactive":
                    print(f"  Setting {model_id} to inactive (in ALWAYS_INACTIVE_MODELS list)")
                    existing_model.status = "inactive"
            # Otherwise, preserve existing status

            # Update the config
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

            # Determine status for new model based on configuration
            if model_id in ALWAYS_ACTIVE_MODELS:
                status = "active"
                print(f"  Setting new model {model_id} to active (in ALWAYS_ACTIVE_MODELS list)")
            elif model_id in ALWAYS_INACTIVE_MODELS:
                status = "inactive"
                print(f"  Setting new model {model_id} to inactive (in ALWAYS_INACTIVE_MODELS list)")
            else:
                status = DEFAULT_NEW_MODEL_STATUS
                print(f"  Setting new model {model_id} to {status} (default for new models)")

            # Create the model
            new_model = AIModel(
                name=model_id,
                display_name=display_name,
                provider_id=provider.id,
                model_type=model_type,
                capabilities=["chat", "completion"],
                status=status,
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
    # Load environment variables (API Key)
    env = load_env_variables()
    api_key = env["api_key"]

    if not api_key:
        print("Error: EXTERNAL_LLM_API_KEY not found in .env file or environment")
        return

    # Fetch models from Mistral API
    print("Fetching models from Mistral API...")
    models = fetch_mistral_models(api_key)

    if not models:
        print("No models received from Mistral API")
        return

    print(f"Received {len(models)} models from Mistral API")

    # Connect to database using the explicitly configured SessionLocal
    db = SessionLocal()
    try:
        # Verify connection
        db.execute(text("SELECT 1")) # Import text from sqlalchemy
        print(f"Successfully connected to database using URL: {DATABASE_URL}")

        # Get or create Mistral provider
        provider = get_or_create_mistral_provider(db)

        # Seed models
        seed_mistral_models(db, provider, models)

        print("Model seeding completed successfully")
    except Exception as e:
        print(f"Error during database operation: {str(e)}")
    finally:
        db.close()


if __name__ == "__main__":
    # Import text here to avoid potential circular imports earlier
    from sqlalchemy import text
    main()