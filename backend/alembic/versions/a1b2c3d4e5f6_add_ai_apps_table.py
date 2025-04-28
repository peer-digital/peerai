"""
add ai_apps table

Revision ID: a1b2c3d4e5f6
Revises: 000f1cba6e74
Create Date: 2025-04-16 15:00:00.000000
"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'a1b2c3d4e5f6'
down_revision = '000f1cba6e74'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'ai_apps',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('slug', sa.String(), nullable=False, unique=True),
        sa.Column('name', sa.String(), nullable=False),
        sa.Column('description', sa.String(), nullable=True),
        sa.Column('icon_url', sa.String(), nullable=True),
        sa.Column('app_url', sa.String(), nullable=False),
        sa.Column('tags', sa.JSON(), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default=sa.text('true')),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('now()')),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.text('now()')),
    )


def downgrade() -> None:
    op.drop_table('ai_apps')