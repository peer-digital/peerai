"""fix_model_registry_tables

Revision ID: fix_model_registry
Revises: 775fcc5fd19a
Create Date: 2025-03-15 10:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.sql import text
from sqlalchemy import inspect


# revision identifiers, used by Alembic.
revision: str = "fix_model_registry"
down_revision: Union[str, None] = "775fcc5fd19a"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Get database connection
    connection = op.get_bind()
    inspector = inspect(connection)
    existing_tables = inspector.get_table_names()
    
    # Only create tables if they don't exist
    if "model_providers" not in existing_tables:
        # Create model_providers table
        op.create_table(
            "model_providers",
            sa.Column("id", sa.Integer(), nullable=False),
            sa.Column("name", sa.String(), nullable=False),
            sa.Column("display_name", sa.String(), nullable=False),
            sa.Column("api_base_url", sa.String(), nullable=False),
            sa.Column("api_key_env_var", sa.String(), nullable=False),
            sa.Column("is_active", sa.Boolean(), default=True),
            sa.Column("created_at", sa.DateTime(), server_default=sa.text("now()"), nullable=False),
            sa.Column("updated_at", sa.DateTime(), server_default=sa.text("now()"), nullable=False),
            sa.Column("config", sa.JSON(), nullable=True),
            sa.PrimaryKeyConstraint("id"),
            sa.UniqueConstraint("name"),
        )
        op.create_index(op.f("ix_model_providers_id"), "model_providers", ["id"], unique=False)

    if "ai_models" not in existing_tables:
        # Create ai_models table
        op.create_table(
            "ai_models",
            sa.Column("id", sa.Integer(), nullable=False),
            sa.Column("name", sa.String(), nullable=False),
            sa.Column("display_name", sa.String(), nullable=False),
            sa.Column("provider_id", sa.Integer(), nullable=False),
            sa.Column("model_type", sa.String(), nullable=False),
            sa.Column("capabilities", sa.JSON(), nullable=True),
            sa.Column("context_window", sa.Integer(), nullable=True),
            sa.Column("status", sa.String(), default="active"),
            sa.Column("is_default", sa.Boolean(), default=False),
            sa.Column("cost_per_1k_input_tokens", sa.Float(), default=0.0),
            sa.Column("cost_per_1k_output_tokens", sa.Float(), default=0.0),
            sa.Column("created_at", sa.DateTime(), server_default=sa.text("now()"), nullable=False),
            sa.Column("updated_at", sa.DateTime(), server_default=sa.text("now()"), nullable=False),
            sa.Column("config", sa.JSON(), nullable=True),
            sa.ForeignKeyConstraint(["provider_id"], ["model_providers.id"]),
            sa.PrimaryKeyConstraint("id"),
        )
        op.create_index(op.f("ix_ai_models_id"), "ai_models", ["id"], unique=False)

    if "model_request_mappings" not in existing_tables:
        # Create model_request_mappings table
        op.create_table(
            "model_request_mappings",
            sa.Column("id", sa.Integer(), nullable=False),
            sa.Column("model_id", sa.Integer(), nullable=False),
            sa.Column("peer_param", sa.String(), nullable=False),
            sa.Column("provider_param", sa.String(), nullable=False),
            sa.Column("transform_function", sa.String(), nullable=True),
            sa.Column("created_at", sa.DateTime(), server_default=sa.text("now()"), nullable=False),
            sa.Column("updated_at", sa.DateTime(), server_default=sa.text("now()"), nullable=False),
            sa.ForeignKeyConstraint(["model_id"], ["ai_models.id"]),
            sa.PrimaryKeyConstraint("id"),
        )
        op.create_index(op.f("ix_model_request_mappings_id"), "model_request_mappings", ["id"], unique=False)

    # Check if data already exists in model_providers
    result = connection.execute(text("SELECT COUNT(*) FROM model_providers"))
    count = result.scalar()
    
    # Only insert data if tables are empty
    if count == 0:
        # Insert default providers with hardcoded IDs to avoid SELECT queries
        op.execute(
            """
            INSERT INTO model_providers (id, name, display_name, api_base_url, api_key_env_var, is_active, config)
            VALUES 
            (1, 'hosted', 'Hosted LLM', 'https://llm-api.bahnhof.se/v1/completions', 'HOSTED_LLM_API_KEY', true, '{"request_format": "direct"}'),
            (2, 'mistral', 'Mistral AI', 'https://api.mistral.ai/v1/chat/completions', 'EXTERNAL_LLM_API_KEY', true, '{"request_format": "chat"}')
            """
        )

        # Use hardcoded IDs instead of querying
        hosted_id = 1
        mistral_id = 2

        # Insert default models with hardcoded IDs
        op.execute(
            f"""
            INSERT INTO ai_models (id, name, display_name, provider_id, model_type, capabilities, context_window, status, is_default, cost_per_1k_input_tokens, cost_per_1k_output_tokens, config)
            VALUES 
            (1, 'hosted-llm', 'Hosted LLM', {hosted_id}, 'text', '["completion"]', 8192, 'active', true, 0.0, 0.0, '{{}}'),
            (2, 'mistral-tiny', 'Mistral Tiny', {mistral_id}, 'text', '["chat", "completion"]', 32000, 'active', false, 0.14, 0.42, '{{}}'),
            (3, 'mistral-small', 'Mistral Small', {mistral_id}, 'text', '["chat", "completion"]', 32000, 'active', false, 0.6, 1.8, '{{}}'),
            (4, 'mistral-medium', 'Mistral Medium', {mistral_id}, 'text', '["chat", "completion"]', 32000, 'active', false, 2.7, 8.1, '{{}}')
            """
        )

        # Use hardcoded IDs for models
        hosted_model_id = 1
        mistral_tiny_id = 2

        # Insert parameter mappings for hosted model
        op.execute(
            f"""
            INSERT INTO model_request_mappings (model_id, peer_param, provider_param)
            VALUES 
            ({hosted_model_id}, 'prompt', 'prompt'),
            ({hosted_model_id}, 'max_tokens', 'max_tokens'),
            ({hosted_model_id}, 'temperature', 'temperature')
            """
        )

        # Insert parameter mappings for Mistral models
        op.execute(
            f"""
            INSERT INTO model_request_mappings (model_id, peer_param, provider_param, transform_function)
            VALUES 
            ({mistral_tiny_id}, 'prompt', 'messages', 'format_as_chat_message'),
            ({mistral_tiny_id}, 'max_tokens', 'max_tokens', NULL),
            ({mistral_tiny_id}, 'temperature', 'temperature', NULL),
            ({mistral_tiny_id}, 'top_p', 'top_p', NULL),
            ({mistral_tiny_id}, 'stop', 'stop', NULL),
            ({mistral_tiny_id}, 'random_seed', 'random_seed', NULL),
            ({mistral_tiny_id}, 'safe_prompt', 'safe_prompt', NULL),
            ({mistral_tiny_id}, 'presence_penalty', 'presence_penalty', NULL),
            ({mistral_tiny_id}, 'frequency_penalty', 'frequency_penalty', NULL)
            """
        )


def downgrade() -> None:
    # Drop tables in reverse order
    op.drop_table("model_request_mappings")
    op.drop_table("ai_models")
    op.drop_table("model_providers") 