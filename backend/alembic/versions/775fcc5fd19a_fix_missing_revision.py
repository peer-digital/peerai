"""fix_missing_revision

Revision ID: 775fcc5fd19a
Revises: model_registry_001
Create Date: 2025-03-15 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "775fcc5fd19a"
down_revision: Union[str, None] = "model_registry_001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # This is a dummy migration to fix the missing revision in the chain
    pass


def downgrade() -> None:
    # This is a dummy migration to fix the missing revision in the chain
    pass 