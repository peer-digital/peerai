"""Add created_at to system settings

Revision ID: add_created_at_new
Revises: 13161fcee912
Create Date: 2024-02-23 16:45:00.000000
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = "add_created_at_new"
down_revision = "13161fcee912"
branch_labels = None
depends_on = None


def upgrade():
    # Let Alembic handle the transaction
    connection = op.get_bind()
    
    # Check if created_at exists
    has_created_at = connection.execute("""
        SELECT EXISTS (
            SELECT 1 
            FROM information_schema.columns 
            WHERE table_name = 'system_settings' 
            AND column_name = 'created_at'
        );
    """).scalar()
    
    if not has_created_at:
        op.add_column('system_settings',
            sa.Column('created_at', 
                     postgresql.TIMESTAMP(timezone=True),
                     server_default=sa.text('NOW()'),
                     nullable=False)
        )
    
    # Update updated_at column type
    op.execute("""
        ALTER TABLE system_settings 
        ALTER COLUMN updated_at TYPE TIMESTAMP WITH TIME ZONE 
        USING updated_at AT TIME ZONE 'UTC';
    """)


def downgrade():
    # Let Alembic handle the transaction
    connection = op.get_bind()
    
    # Check if created_at exists before trying to drop
    has_created_at = connection.execute("""
        SELECT EXISTS (
            SELECT 1 
            FROM information_schema.columns 
            WHERE table_name = 'system_settings' 
            AND column_name = 'created_at'
        );
    """).scalar()
    
    if has_created_at:
        op.drop_column('system_settings', 'created_at')
    
    # Revert updated_at column type
    op.execute("""
        ALTER TABLE system_settings 
        ALTER COLUMN updated_at TYPE TIMESTAMP WITHOUT TIME ZONE 
        USING updated_at AT TIME ZONE 'UTC';
    """)