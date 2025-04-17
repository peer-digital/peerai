"""merge existing heads

Revision ID: 5b7a1ccd6324
Revises: a1b2c3d4e5f6
Create Date: 2025-04-16 23:46:10.995646

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '5b7a1ccd6324'
down_revision: Union[str, None] = 'a1b2c3d4e5f6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
