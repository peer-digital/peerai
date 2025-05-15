"""merge_heads

Revision ID: 20f9d2e4e4e9
Revises: add_content_manager_role, add_dark_icon_url_column, merge_heads_for_deployed_apps
Create Date: 2025-05-15 20:23:04.301022

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '20f9d2e4e4e9'
down_revision: Union[str, None] = ('add_content_manager_role', 'add_dark_icon_url_column', 'merge_heads_for_deployed_apps')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
