"""Rename CONTENT_MANAGER role to APP_MANAGER

Revision ID: rename_role
Revises: add_content_manager_role
Create Date: 2024-05-20 12:00:00.000000

"""
from typing import Sequence, Union
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "rename_role"
down_revision: Union[str, None] = "add_content_manager_role"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Temporarily change the column type to string
    op.execute("ALTER TABLE users ALTER COLUMN role TYPE VARCHAR")

    # Update any CONTENT_MANAGER roles to APP_MANAGER
    op.execute("UPDATE users SET role = 'APP_MANAGER' WHERE role = 'CONTENT_MANAGER'")

    # Drop the old enum type
    op.execute("DROP TYPE role")

    # Create the new enum type with APP_MANAGER instead of CONTENT_MANAGER
    op.execute(
        "CREATE TYPE role AS ENUM ('GUEST', 'USER', 'USER_ADMIN', 'SUPER_ADMIN', 'APP_MANAGER')"
    )

    # Convert the column back to enum type
    op.execute("ALTER TABLE users ALTER COLUMN role TYPE role USING role::role")


def downgrade() -> None:
    # Temporarily change the column type to string
    op.execute("ALTER TABLE users ALTER COLUMN role TYPE VARCHAR")

    # Update any APP_MANAGER roles back to CONTENT_MANAGER
    op.execute("UPDATE users SET role = 'CONTENT_MANAGER' WHERE role = 'APP_MANAGER'")

    # Drop the new enum type
    op.execute("DROP TYPE role")

    # Create the old enum type with CONTENT_MANAGER
    op.execute(
        "CREATE TYPE role AS ENUM ('GUEST', 'USER', 'USER_ADMIN', 'SUPER_ADMIN', 'CONTENT_MANAGER')"
    )

    # Convert the column back to enum type
    op.execute("ALTER TABLE users ALTER COLUMN role TYPE role USING role::role")
