"""Add created_at to system_settings

Revision ID: add_created_at_new
Revises: 13161fcee912
Create Date: 2024-03-20 10:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = 'add_created_at_new'
down_revision: Union[str, None] = '13161fcee912'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Try to add created_at column if it doesn't exist
    try:
        op.add_column('system_settings',
                    sa.Column('created_at', sa.DateTime(timezone=True), 
                             server_default=sa.text('now()'), 
                             nullable=False))
    except Exception as e:
        if 'already exists' not in str(e):
            raise

    # Update updated_at to have timezone support
    op.alter_column('system_settings', 'updated_at',
                    type_=sa.DateTime(timezone=True),
                    postgresql_using='updated_at AT TIME ZONE \'UTC\'',
                    server_default=sa.text('now()'),
                    nullable=False)


def downgrade() -> None:
    # Remove created_at column
    op.drop_column('system_settings', 'created_at')
    
    # Revert updated_at to non-timezone type
    op.alter_column('system_settings', 'updated_at',
                    type_=sa.DateTime(),
                    postgresql_using='updated_at::timestamp',
                    server_default=None) 