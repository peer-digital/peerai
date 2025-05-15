"""
Update deployed apps schema

Revision ID: update_deployed_apps_schema
Revises: add_document_tables
Create Date: 2025-05-01 10:00:00.000000
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'update_deployed_apps_schema'
down_revision = 'add_document_tables'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add new columns to deployed_apps table
    op.add_column('deployed_apps', sa.Column('description', sa.Text(), nullable=True))
    op.add_column('deployed_apps', sa.Column('icon_url', sa.String(), nullable=True))
    op.add_column('deployed_apps', sa.Column('tags', postgresql.JSONB(astext_type=sa.Text()), nullable=True))
    op.add_column('deployed_apps', sa.Column('usage_count', sa.Integer(), nullable=False, server_default='0'))
    op.add_column('deployed_apps', sa.Column('last_used_at', sa.DateTime(), nullable=True))


def downgrade() -> None:
    # Remove added columns
    op.drop_column('deployed_apps', 'description')
    op.drop_column('deployed_apps', 'icon_url')
    op.drop_column('deployed_apps', 'tags')
    op.drop_column('deployed_apps', 'usage_count')
    op.drop_column('deployed_apps', 'last_used_at')
