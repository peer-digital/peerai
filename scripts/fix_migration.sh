#!/bin/bash
set -e

echo "=== Database Migration Fix Tool ==="
echo "Running on: $(hostname)"
echo "Date: $(date)"
echo "User: $(whoami)"
echo ""

APP_DIR="/home/ubuntu/peer-ai"
BACKEND_DIR="$APP_DIR/backend"
VENV_DIR="$BACKEND_DIR/venv"
ALEMBIC_DIR="$BACKEND_DIR/alembic"
VERSIONS_DIR="$ALEMBIC_DIR/versions"

# Check if the backend directory exists
if [ ! -d "$BACKEND_DIR" ]; then
    echo "Error: Backend directory not found at $BACKEND_DIR"
    exit 1
fi

# Activate virtual environment
echo "Activating virtual environment..."
source "$VENV_DIR/bin/activate"

# Find the problematic migration file
MIGRATION_FILE="$VERSIONS_DIR/16e5e60f9836_add_email_verification_fields.py"

if [ ! -f "$MIGRATION_FILE" ]; then
    echo "Looking for the migration file..."
    MIGRATION_FILE=$(find "$VERSIONS_DIR" -type f -name "*_add_email_verification_fields.py")
    
    if [ -z "$MIGRATION_FILE" ]; then
        echo "Error: Could not find the migration file for add_email_verification_fields"
        exit 1
    fi
    
    echo "Found migration file: $MIGRATION_FILE"
fi

# Create a backup of the original file
echo "Creating backup of the migration file..."
cp "$MIGRATION_FILE" "${MIGRATION_FILE}.bak"

# Create a new version of the migration file with the fix
echo "Creating fixed version of the migration file..."
cat > "$MIGRATION_FILE" << 'EOF'
"""add_email_verification_fields

Revision ID: 16e5e60f9836
Revises: add_referral_system
Create Date: 2025-03-13 21:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '16e5e60f9836'
down_revision = 'add_referral_system'
branch_labels = None
depends_on = None


def upgrade():
    # Check if constraint exists before trying to drop it
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    
    # Get all constraints for the referrals table
    constraints = []
    try:
        # This will fail if the table doesn't exist
        constraints = inspector.get_unique_constraints('referrals')
    except Exception as e:
        print(f"Could not get constraints for referrals table: {e}")
    
    # Check if the constraint exists
    constraint_exists = False
    for constraint in constraints:
        if constraint.get('name') == 'uq_referrals_referee_id':
            constraint_exists = True
            break
    
    # Only drop the constraint if it exists
    if constraint_exists:
        print("Dropping constraint uq_referrals_referee_id")
        op.drop_constraint('uq_referrals_referee_id', 'referrals', type_='unique')
    else:
        print("Constraint uq_referrals_referee_id does not exist, skipping")
    
    # Add email verification fields
    op.add_column('users', sa.Column('email_verified', sa.Boolean(), nullable=True, server_default='false'))
    op.add_column('users', sa.Column('verification_token', sa.String(length=255), nullable=True))
    op.add_column('users', sa.Column('verification_token_expires_at', sa.DateTime(), nullable=True))


def downgrade():
    op.drop_column('users', 'verification_token_expires_at')
    op.drop_column('users', 'verification_token')
    op.drop_column('users', 'email_verified')
    
    # Only add the constraint back in downgrade if we're sure it existed
    # For safety, we'll skip this in the downgrade
EOF

echo "Fixed migration file created."

# Run migrations
echo "Running migrations..."
cd "$BACKEND_DIR"
alembic upgrade head

if [ $? -eq 0 ]; then
    echo "✅ Migrations completed successfully!"
    # Remove the backup file if successful
    rm -f "${MIGRATION_FILE}.bak"
else
    echo "❌ Migrations failed. Restoring original migration file..."
    mv "${MIGRATION_FILE}.bak" "$MIGRATION_FILE"
    echo "Original migration file restored. Please check the database manually."
    exit 1
fi

echo "=== Database Migration Fix Complete ===" 