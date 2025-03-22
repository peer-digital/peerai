#!/bin/bash
# Ensure all required migration files exist to avoid alembic errors
# This script creates placeholder migration files for any missing dependencies

TARGET_DIR="/home/ubuntu/peer-ai/backend/migrations/versions"
mkdir -p "$TARGET_DIR"

echo "Checking for required migration files..."

# Create model_registry_migration.py if it doesn't exist
if [ ! -f "$TARGET_DIR/model_registry_migration.py" ]; then
    echo "Creating missing dependency: model_registry_migration.py"
    cat > "$TARGET_DIR/model_registry_migration.py" << 'EOL'
"""model registry

Revision ID: model_registry_migration
Revises: 
Create Date: 2025-02-15 10:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'model_registry_migration'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
EOL
fi

# Create 5bded3ce5e9e_add_rbac_implementation.py if it doesn't exist
if [ ! -f "$TARGET_DIR/5bded3ce5e9e_add_rbac_implementation.py" ]; then
    echo "Creating missing dependency: 5bded3ce5e9e_add_rbac_implementation.py"
    cat > "$TARGET_DIR/5bded3ce5e9e_add_rbac_implementation.py" << 'EOL'
"""add rbac implementation

Revision ID: 5bded3ce5e9e
Revises: 
Create Date: 2025-01-20 15:30:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '5bded3ce5e9e'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
EOL
fi

# Create b05db0982fa5_merge_heads.py if it doesn't exist
if [ ! -f "$TARGET_DIR/b05db0982fa5_merge_heads.py" ]; then
    echo "Creating missing dependency: b05db0982fa5_merge_heads.py"
    cat > "$TARGET_DIR/b05db0982fa5_merge_heads.py" << 'EOL'
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
EOL
fi

# Create 85766947a5e5_update_role_enum_values.py if it doesn't exist
if [ ! -f "$TARGET_DIR/85766947a5e5_update_role_enum_values.py" ]; then
    echo "Creating missing dependency: 85766947a5e5_update_role_enum_values.py"
    cat > "$TARGET_DIR/85766947a5e5_update_role_enum_values.py" << 'EOL'
"""update_role_enum_values

Revision ID: 85766947a5e5
Revises: 5bded3ce5e9e
Create Date: 2025-02-12 14:21:33.172766

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '85766947a5e5'
down_revision: Union[str, None] = '5bded3ce5e9e'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
EOL
fi

# Create fix_model_registry_migration.py if it doesn't exist
if [ ! -f "$TARGET_DIR/fix_model_registry_migration.py" ]; then
    echo "Creating missing dependency: fix_model_registry_migration.py"
    cat > "$TARGET_DIR/fix_model_registry_migration.py" << 'EOL'
"""fix model registry

Revision ID: fix_model_registry
Revises: model_registry_migration
Create Date: 2025-02-28 10:30:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'fix_model_registry'
down_revision: Union[str, None] = 'model_registry_migration'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
EOL
fi

echo "Migration dependency check complete." 