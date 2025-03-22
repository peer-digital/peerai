"""merge_heads

Revision ID: b05db0982fa5
Revises: 85766947a5e5, fix_model_registry
Create Date: 2025-03-02 19:57:55.172766

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b05db0982fa5'
down_revision: Union[str, None] = ('85766947a5e5', 'fix_model_registry')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
