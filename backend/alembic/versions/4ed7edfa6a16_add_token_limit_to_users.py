"""add token limit to users

Revision ID: 4ed7edfa6a16
Revises: 
Create Date: 2024-03-19 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '4ed7edfa6a16'
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add token_limit column to users table if it does not exist, with default value of 10000
    op.execute(
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS token_limit INTEGER DEFAULT 10000 NOT NULL"
    )


def downgrade() -> None:
    # Remove token_limit column from users table if it exists
    op.execute("ALTER TABLE users DROP COLUMN IF EXISTS token_limit")
