#!/bin/bash
set -e

echo "=== Migration Fix Tool ==="
echo "Date: $(date)"
echo "User: $(whoami)"
echo ""

# Define variables
APP_DIR="/home/ubuntu/peer-ai"
BACKEND_DIR="$APP_DIR/backend"
ALEMBIC_DIR="$BACKEND_DIR/alembic"
VERSIONS_DIR="$ALEMBIC_DIR/versions"
MIGRATION_FILE="$VERSIONS_DIR/16e5e60f9836_add_email_verification_fields.py"
BACKUP_FILE="$MIGRATION_FILE.bak"

# Check if we're on the VM
if [[ "$(hostname)" != *"ubuntu"* ]] && [[ "$(whoami)" != "ubuntu" ]]; then
    echo "This script must be run on the VM."
    echo "Please connect to the VM first using ./scripts/connect_to_vm.sh"
    exit 1
fi

# Check if the backend directory exists
if [ ! -d "$BACKEND_DIR" ]; then
    echo "Error: Backend directory not found at $BACKEND_DIR"
    exit 1
fi

# Check if the migration file exists
if [ ! -f "$MIGRATION_FILE" ]; then
    echo "Error: Migration file not found at $MIGRATION_FILE"
    exit 1
fi

# Create a backup of the original migration file
echo "Creating backup of original migration file..."
cp "$MIGRATION_FILE" "$BACKUP_FILE"

# Modify the migration file to check if the constraint exists before dropping it
echo "Modifying migration file to check if constraint exists before dropping it..."
cat > "$MIGRATION_FILE" << 'EOF'
"""add_email_verification_fields

Revision ID: 16e5e60f9836
Revises: add_referral_system
Create Date: 2023-05-15 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.engine.reflection import Inspector


# revision identifiers, used by Alembic.
revision = '16e5e60f9836'
down_revision = 'add_referral_system'
branch_labels = None
depends_on = None


def constraint_exists(constraint_name, table_name):
    """Check if a constraint exists in the database."""
    conn = op.get_bind()
    inspector = Inspector.from_engine(conn)
    constraints = inspector.get_unique_constraints(table_name)
    for constraint in constraints:
        if constraint['name'] == constraint_name:
            return True
    
    # Also check in pg_constraint directly
    result = conn.execute(sa.text(
        "SELECT COUNT(*) FROM pg_constraint WHERE conname = :constraint_name"
    ), {"constraint_name": constraint_name}).scalar()
    
    return result > 0


def upgrade():
    # Add email verification fields to users table
    op.add_column('users', sa.Column('email_verified', sa.Boolean(), nullable=False, server_default='false'))
    op.add_column('users', sa.Column('verification_token', sa.String(length=255), nullable=True))
    op.add_column('users', sa.Column('verification_token_expires_at', sa.DateTime(), nullable=True))
    
    # Try to drop the unique constraint on referee_id if it exists
    if constraint_exists('uq_referrals_referee_id', 'referrals'):
        op.drop_constraint('uq_referrals_referee_id', 'referrals', type_='unique')
        print("Dropped constraint 'uq_referrals_referee_id'")
    else:
        print("Constraint 'uq_referrals_referee_id' does not exist, skipping")


def downgrade():
    # Remove email verification fields from users table
    op.drop_column('users', 'verification_token_expires_at')
    op.drop_column('users', 'verification_token')
    op.drop_column('users', 'email_verified')
    
    # Add back the unique constraint on referee_id
    op.create_unique_constraint('uq_referrals_referee_id', 'referrals', ['referee_id'])
EOF

echo "Migration file modified successfully."

# Run the migration
echo "Running the migration..."
cd "$BACKEND_DIR"
source venv/bin/activate
alembic upgrade head

if [ $? -eq 0 ]; then
    echo "✅ Migration completed successfully!"
else
    echo "❌ Migration failed."
    echo "Restoring original migration file..."
    cp "$BACKUP_FILE" "$MIGRATION_FILE"
    exit 1
fi

# Clean up
echo "Cleaning up..."
rm -f "$BACKUP_FILE"

echo "=== Migration Fix Complete ===" 