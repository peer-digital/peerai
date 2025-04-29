"""Add default_api_key_id to users table

Revision ID: add_default_api_key_id
Revises: e4ecb0a9d0ed
Create Date: 2024-04-29 07:30:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'add_default_api_key_id'
down_revision = 'e4ecb0a9d0ed'  # Using the latest head revision
branch_labels = None
depends_on = None


def upgrade():
    # Add default_api_key_id column to users table
    op.add_column('users', sa.Column('default_api_key_id', sa.Integer(), nullable=True))
    # Add foreign key constraint
    op.create_foreign_key(
        'fk_users_default_api_key_id_api_keys',
        'users', 'api_keys',
        ['default_api_key_id'], ['id']
    )


def downgrade():
    # Remove foreign key constraint
    op.drop_constraint('fk_users_default_api_key_id_api_keys', 'users', type_='foreignkey')
    # Remove default_api_key_id column
    op.drop_column('users', 'default_api_key_id') 