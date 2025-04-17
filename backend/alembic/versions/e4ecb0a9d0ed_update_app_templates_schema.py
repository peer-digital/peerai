"""
update_app_templates_schema

Revision ID: e4ecb0a9d0ed
Revises: 9597eef8850a
Create Date: 2025-03-04 10:00:00.000000
"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'e4ecb0a9d0ed'
down_revision = '9597eef8850a'
branch_labels = None
depends_on = None

def upgrade() -> None:
    """No-op stub for missing migration"""
    pass

def downgrade() -> None:
    """No-op stub for missing migration"""
    pass