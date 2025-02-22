"""Add system settings table

Revision ID: b0e536be0f73
Revises: 20250222_004903
Create Date: 2024-02-22 10:25:04.123456

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b0e536be0f73'
down_revision: Union[str, None] = '20250222_004903'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create system_settings table only
    op.create_table('system_settings',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('rate_limit', sa.JSON(), nullable=True),
        sa.Column('security', sa.JSON(), nullable=True),
        sa.Column('models', sa.JSON(), nullable=True),
        sa.Column('monitoring', sa.JSON(), nullable=True),
        sa.Column('beta_features', sa.JSON(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.Column('updated_by', sa.Integer(), nullable=True),
        sa.ForeignKeyConstraint(['updated_by'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )


def downgrade() -> None:
    # Only drop the system_settings table
    op.drop_table('system_settings')
