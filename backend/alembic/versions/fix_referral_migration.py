"""Fix referral migration revision chain

Revision ID: fix_referral_migration
Revises: 9b359a119dfc
Create Date: 2024-03-19 13:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'fix_referral_migration'
down_revision = '9b359a119dfc'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # This migration is just to fix the revision chain
    # No actual database changes are needed
    pass


def downgrade() -> None:
    # No downgrade needed as this is just a revision chain fix
    pass 