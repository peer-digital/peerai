"""Fix referral system migration chain

Revision ID: add_referral_system
Revises: 160b9131b424
Create Date: 2024-03-19 14:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'add_referral_system'
down_revision = '160b9131b424'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create referrals table - same as in 9b359a119dfc_add_referrals_table.py
    op.create_table(
        'referrals',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('referrer_id', sa.Integer(), nullable=False),
        sa.Column('referee_id', sa.Integer(), nullable=True),
        sa.Column('referral_code', sa.String(), nullable=False),
        sa.Column('is_used', sa.Boolean(), default=False),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
        sa.Column('used_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['referrer_id'], ['users.id']),
        sa.ForeignKeyConstraint(['referee_id'], ['users.id']),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('referral_code')
    )
    op.create_index(op.f('ix_referrals_id'), 'referrals', ['id'], unique=False)


def downgrade() -> None:
    # Drop referrals table
    op.drop_index(op.f('ix_referrals_id'), table_name='referrals')
    op.drop_table('referrals') 