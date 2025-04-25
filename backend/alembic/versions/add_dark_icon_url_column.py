"""
add_dark_icon_url_column

Revision ID: add_dark_icon_url_column
Revises: e4ecb0a9d0ed
Create Date: 2023-07-15 10:00:00.000000
"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'add_dark_icon_url_column'
down_revision = 'e4ecb0a9d0ed'
branch_labels = None
depends_on = None

def upgrade() -> None:
    """Add dark_icon_url column to app_templates table"""
    # Check if the column already exists
    conn = op.get_bind()
    result = conn.execute("""SELECT column_name FROM information_schema.columns
                          WHERE table_name = 'app_templates' AND column_name = 'dark_icon_url'""")
    if result.rowcount == 0:
        # Add the column only if it doesn't exist
        op.add_column('app_templates', sa.Column('dark_icon_url', sa.String(), nullable=True))

def downgrade() -> None:
    """Remove dark_icon_url column from app_templates table"""
    # Check if the column exists before dropping it
    conn = op.get_bind()
    result = conn.execute("""SELECT column_name FROM information_schema.columns
                          WHERE table_name = 'app_templates' AND column_name = 'dark_icon_url'""")
    if result.rowcount > 0:
        # Drop the column only if it exists
        op.drop_column('app_templates', 'dark_icon_url')
