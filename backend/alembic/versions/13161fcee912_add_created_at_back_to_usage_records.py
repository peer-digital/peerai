"""add_created_at_back_to_usage_records

Revision ID: 13161fcee912
Revises: f8243840b28d
Create Date: 2025-02-22 22:04:10.588025

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '13161fcee912'
down_revision: Union[str, None] = 'f8243840b28d'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add all potentially missing columns to usage_records
    # Add created_at if it doesn't exist
    try:
        op.add_column('usage_records', sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False))
    except Exception:
        pass  # Column might already exist

    # Add model if it doesn't exist
    try:
        op.add_column('usage_records', sa.Column('model', sa.String(), nullable=True))
    except Exception:
        pass  # Column might already exist

    # Add error if it doesn't exist
    try:
        op.add_column('usage_records', sa.Column('error', sa.Boolean(), server_default=sa.text('false'), nullable=False))
    except Exception:
        pass  # Column might already exist

    # Add error_type if it doesn't exist
    try:
        op.add_column('usage_records', sa.Column('error_type', sa.String(), nullable=True))
    except Exception:
        pass  # Column might already exist


def downgrade() -> None:
    # Remove columns from usage_records
    op.drop_column('usage_records', 'created_at')
    op.drop_column('usage_records', 'model')
    op.drop_column('usage_records', 'error')
    op.drop_column('usage_records', 'error_type')
