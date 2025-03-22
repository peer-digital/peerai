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
    # Add token_limit column to users table with default value of 10000
    op.add_column('users', sa.Column('token_limit', sa.Integer(), nullable=False, server_default='10000'))


def downgrade() -> None:
    # Remove token_limit column from users table
    op.drop_column('users', 'token_limit')
