"""add_token_limit_to_users

Revision ID: 160b9131b424
Revises: 000f1cba6e74
Create Date: 2025-03-04 09:49:17.191985

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '160b9131b424'
down_revision: Union[str, None] = '000f1cba6e74'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
