"""Add icon_type to app_templates

Revision ID: 891d11b2a31d
Revises: 20f9d2e4e4e9
Create Date: 2025-05-15 20:23:09.729579

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '891d11b2a31d'
down_revision: Union[str, None] = '20f9d2e4e4e9'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add icon_type column to app_templates table
    op.add_column('app_templates', sa.Column('icon_type', sa.String(), nullable=True))


def downgrade() -> None:
    # Remove icon_type column from app_templates table
    op.drop_column('app_templates', 'icon_type')
