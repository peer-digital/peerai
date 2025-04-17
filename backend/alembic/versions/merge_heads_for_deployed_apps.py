"""
merge heads for deployed apps

Revision ID: merge_heads_for_deployed_apps
Revises: add_created_at_new, add_deployed_apps_table, e4ecb0a9d0ed
Create Date: 2025-04-17 19:15:00.000000
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'merge_heads_for_deployed_apps'
down_revision: Union[str, None] = ('add_created_at_new', 'add_deployed_apps_table', 'e4ecb0a9d0ed')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
