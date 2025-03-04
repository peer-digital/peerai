"""merge heads

Revision ID: 000f1cba6e74
Revises: 4ed7edfa6a16, b05db0982fa5
Create Date: 2025-03-04 09:17:54.185177

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '000f1cba6e74'
down_revision: Union[str, None] = ('4ed7edfa6a16', 'b05db0982fa5')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
