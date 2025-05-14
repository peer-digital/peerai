"""Add CONTENT_MANAGER role to role enum

Revision ID: add_content_manager_role
Revises: add_document_tables
Create Date: 2024-05-12 12:00:00.000000

"""
from typing import Sequence, Union
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "add_content_manager_role"
down_revision: Union[str, None] = "add_document_tables"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Temporarily change the column type to string
    op.execute("ALTER TABLE users ALTER COLUMN role TYPE VARCHAR")

    # Drop the old enum type
    op.execute("DROP TYPE role")

    # Create the new enum type with the additional CONTENT_MANAGER role
    op.execute(
        "CREATE TYPE role AS ENUM ('GUEST', 'USER', 'USER_ADMIN', 'SUPER_ADMIN', 'CONTENT_MANAGER')"
    )

    # Convert the column back to enum type
    op.execute("ALTER TABLE users ALTER COLUMN role TYPE role USING role::role")


def downgrade() -> None:
    # Temporarily change the column type to string
    op.execute("ALTER TABLE users ALTER COLUMN role TYPE VARCHAR")

    # Drop the new enum type
    op.execute("DROP TYPE role")

    # Create the old enum type without CONTENT_MANAGER
    op.execute(
        "CREATE TYPE role AS ENUM ('GUEST', 'USER', 'USER_ADMIN', 'SUPER_ADMIN')"
    )

    # Update any CONTENT_MANAGER roles to USER before converting back
    op.execute("UPDATE users SET role = 'USER' WHERE role = 'CONTENT_MANAGER'")

    # Convert the column back to enum type
    op.execute("ALTER TABLE users ALTER COLUMN role TYPE role USING role::role")
