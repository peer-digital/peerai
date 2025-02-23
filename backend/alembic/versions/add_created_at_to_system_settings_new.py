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
    # Execute migration in a single transaction
    op.execute("""
        BEGIN;
        ALTER TABLE system_settings 
            ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE 
            DEFAULT NOW() NOT NULL;
        ALTER TABLE system_settings 
            ALTER COLUMN updated_at TYPE TIMESTAMP WITH TIME ZONE 
            USING updated_at::timestamptz;
        COMMIT;
    """)


def downgrade():
    # Revert changes in a single transaction
    op.execute("""
        BEGIN;
        ALTER TABLE system_settings 
            DROP COLUMN IF EXISTS created_at;
        ALTER TABLE system_settings 
            ALTER COLUMN updated_at TYPE TIMESTAMP WITHOUT TIME ZONE;
        COMMIT;
    """)