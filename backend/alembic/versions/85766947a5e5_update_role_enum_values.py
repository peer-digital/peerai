"""update_role_enum_values

Revision ID: 85766947a5e5
Revises: 5bded3ce5e9e
Create Date: 2024-03-21 00:00:00.000000

"""
from typing import Sequence, Union
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "85766947a5e5"
down_revision: Union[str, None] = "5bded3ce5e9e"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Temporarily change the column type to string
    op.execute("ALTER TABLE users ALTER COLUMN role TYPE VARCHAR")

    # Drop the old enum type
    op.execute("DROP TYPE role")

    # Create the new enum type with uppercase values
    op.execute(
        "CREATE TYPE role AS ENUM ('GUEST', 'USER', 'USER_ADMIN', 'SUPER_ADMIN')"
    )

    # Update the values while they're strings
    op.execute("UPDATE users SET role = 'USER' WHERE role = 'user'")
    op.execute("UPDATE users SET role = 'USER_ADMIN' WHERE role = 'user_admin'")
    op.execute("UPDATE users SET role = 'SUPER_ADMIN' WHERE role = 'super_admin'")
    op.execute("UPDATE users SET role = 'GUEST' WHERE role = 'guest'")

    # Convert the column back to enum type
    op.execute("ALTER TABLE users ALTER COLUMN role TYPE role USING role::role")


def downgrade() -> None:
    # Temporarily change the column type to string
    op.execute("ALTER TABLE users ALTER COLUMN role TYPE VARCHAR")

    # Drop the new enum type
    op.execute("DROP TYPE role")

    # Create the old enum type with lowercase values
    op.execute(
        "CREATE TYPE role AS ENUM ('guest', 'user', 'user_admin', 'super_admin')"
    )

    # Update the values while they're strings
    op.execute("UPDATE users SET role = 'user' WHERE role = 'USER'")
    op.execute("UPDATE users SET role = 'user_admin' WHERE role = 'USER_ADMIN'")
    op.execute("UPDATE users SET role = 'super_admin' WHERE role = 'SUPER_ADMIN'")
    op.execute("UPDATE users SET role = 'guest' WHERE role = 'GUEST'")

    # Convert the column back to enum type
    op.execute("ALTER TABLE users ALTER COLUMN role TYPE role USING role::role")
