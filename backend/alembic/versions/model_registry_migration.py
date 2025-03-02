"""add_model_registry_tables

Revision ID: model_registry_001
Revises: 13161fcee912
Create Date: 2025-03-15 10:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "model_registry_001"
down_revision: Union[str, None] = "13161fcee912"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
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

    # Insert default providers
    op.execute(
        """
        INSERT INTO model_providers (name, display_name, api_base_url, api_key_env_var, is_active, config)
        VALUES 
        ('hosted', 'Hosted LLM', 'https://llm-api.bahnhof.se/v1/completions', 'HOSTED_LLM_API_KEY', true, '{"request_format": "direct"}'),
        ('mistral', 'Mistral AI', 'https://api.mistral.ai/v1/chat/completions', 'EXTERNAL_LLM_API_KEY', true, '{"request_format": "chat"}')
        """
    )

    # Get provider IDs
    hosted_id = op.execute("SELECT id FROM model_providers WHERE name = 'hosted'").fetchone()[0]
    mistral_id = op.execute("SELECT id FROM model_providers WHERE name = 'mistral'").fetchone()[0]

    # Insert default models
    op.execute(
        f"""
        INSERT INTO ai_models (name, display_name, provider_id, model_type, capabilities, context_window, status, is_default, cost_per_1k_input_tokens, cost_per_1k_output_tokens, config)
        VALUES 
        ('hosted-llm', 'Hosted LLM', {hosted_id}, 'text', '["completion"]', 8192, 'active', true, 0.0, 0.0, '{{}}'),
        ('mistral-tiny', 'Mistral Tiny', {mistral_id}, 'text', '["chat", "completion"]', 32000, 'active', false, 0.14, 0.42, '{{}}'),
        ('mistral-small', 'Mistral Small', {mistral_id}, 'text', '["chat", "completion"]', 32000, 'active', false, 0.6, 1.8, '{{}}'),
        ('mistral-medium', 'Mistral Medium', {mistral_id}, 'text', '["chat", "completion"]', 32000, 'active', false, 2.7, 8.1, '{{}}')
        """
    )

    # Get model IDs
    hosted_model_id = op.execute("SELECT id FROM ai_models WHERE name = 'hosted-llm'").fetchone()[0]
    mistral_tiny_id = op.execute("SELECT id FROM ai_models WHERE name = 'mistral-tiny'").fetchone()[0]

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
        ({mistral_tiny_id}, 'temperature', 'temperature', NULL)
        """
    )


def downgrade() -> None:
    # Drop tables in reverse order
    op.drop_table("model_request_mappings")
    op.drop_table("ai_models")
    op.drop_table("model_providers") 