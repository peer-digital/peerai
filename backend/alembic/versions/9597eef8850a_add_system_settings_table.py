"""Add system settings table.

Revision ID: 9597eef8850a
Revises: 20250222_004903
Create Date: 2024-03-19 10:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSON

# revision identifiers, used by Alembic.
revision = "9597eef8850a"
down_revision = "20250222_004903"
branch_labels = None
depends_on = None


def upgrade():
    # Create system_settings table
    op.create_table(
        "system_settings",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("rate_limit", JSON, nullable=False),
        sa.Column("security", JSON, nullable=False),
        sa.Column("models", JSON, nullable=False),
        sa.Column("monitoring", JSON, nullable=False),
        sa.Column("beta_features", JSON, nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )

    # Insert default settings
    op.execute(
        """
        INSERT INTO system_settings (
            rate_limit,
            security,
            models,
            monitoring,
            beta_features,
            created_at,
            updated_at
        ) VALUES (
            '{"enabled": true, "requestsPerMinute": 60, "tokensPerDay": 1000}'::json,
            '{"maxTokenLength": 4096, "allowedOrigins": ["https://app.peerdigital.se"]}'::json,
            '{"defaultModel": "claude-3-sonnet-20240229", "maxContextLength": 200000, "temperature": 0.7}'::json,
            '{"logLevel": "info", "retentionDays": 30, "alertThreshold": 5}'::json,
            '{"visionEnabled": true, "audioEnabled": true}'::json,
            NOW(),
            NOW()
        )
    """
    )


def downgrade():
    op.drop_table("system_settings")
