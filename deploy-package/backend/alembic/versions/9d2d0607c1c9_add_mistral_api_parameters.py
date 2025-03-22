"""add_mistral_api_parameters

Revision ID: 9d2d0607c1c9
Revises: 75727fa631b4
Create Date: 2025-03-18 21:51:19.078974

"""
from typing import Sequence, Union
import sqlalchemy as sa
from alembic import op
from sqlalchemy.sql import text

# revision identifiers, used by Alembic.
revision: str = '9d2d0607c1c9'
down_revision: Union[str, None] = '75727fa631b4'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # First get all Mistral model IDs
    connection = op.get_bind()
    
    # Get Mistral provider ID
    result = connection.execute(text("SELECT id FROM model_providers WHERE name = 'mistral'"))
    mistral_provider_id = result.fetchone()[0]
    
    # Get all Mistral model IDs
    result = connection.execute(
        text(f"SELECT id FROM ai_models WHERE provider_id = {mistral_provider_id}")
    )
    mistral_model_ids = [row[0] for row in result.fetchall()]
    
    # For each Mistral model, add the new parameter mappings
    for model_id in mistral_model_ids:
        # Check if mappings already exist to avoid duplicates
        for param in ["top_p", "stop", "random_seed", "safe_prompt", 
                     "presence_penalty", "frequency_penalty"]:
            # Check if this mapping already exists
            result = connection.execute(
                text(f"SELECT id FROM model_request_mappings WHERE model_id = {model_id} AND peer_param = '{param}'")
            )
            if result.fetchone() is None:
                # Mapping doesn't exist, so add it
                connection.execute(
                    text(f"""
                    INSERT INTO model_request_mappings 
                    (model_id, peer_param, provider_param, transform_function) 
                    VALUES ({model_id}, '{param}', '{param}', NULL)
                    """)
                )
    
    print("Added new Mistral API parameter mappings successfully.")


def downgrade() -> None:
    # Remove the new parameter mappings for Mistral models
    connection = op.get_bind()
    
    # Get Mistral provider ID
    result = connection.execute(text("SELECT id FROM model_providers WHERE name = 'mistral'"))
    mistral_provider_id = result.fetchone()[0]
    
    # Get all Mistral model IDs
    result = connection.execute(
        text(f"SELECT id FROM ai_models WHERE provider_id = {mistral_provider_id}")
    )
    mistral_model_ids = [row[0] for row in result.fetchall()]
    
    # For each Mistral model, remove the new parameter mappings
    for model_id in mistral_model_ids:
        for param in ["top_p", "stop", "random_seed", "safe_prompt", 
                     "presence_penalty", "frequency_penalty"]:
            connection.execute(
                text(f"""
                DELETE FROM model_request_mappings 
                WHERE model_id = {model_id} AND peer_param = '{param}'
                """)
            )
    
    print("Removed added Mistral API parameter mappings successfully.")
