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

# Check if the problematic migration file exists
MIGRATION_FILE="$VERSIONS_DIR/16e5e60f9836_add_email_verification_fields.py"
if [ ! -f "$MIGRATION_FILE" ]; then
    echo "Error: Migration file not found at $MIGRATION_FILE"
    exit 1
fi

echo "Creating backup of the migration file..."
cp "$MIGRATION_FILE" "${MIGRATION_FILE}.bak"

echo "Modifying the migration file to handle missing constraint..."
# Use sed to modify the migration file to check if constraint exists before dropping it
sed -i 's/op.drop_constraint(.uq_referrals_referee_id., .referrals., type_=.unique.)/# Check if constraint exists before dropping it\n    conn = op.get_bind()\n    result = conn.execute("SELECT 1 FROM pg_constraint WHERE conname = \x27uq_referrals_referee_id\x27").fetchone()\n    if result:\n        op.drop_constraint(\x27uq_referrals_referee_id\x27, \x27referrals\x27, type_=\x27unique\x27)\n    else:\n        print("Constraint uq_referrals_referee_id does not exist, skipping")/g' "$MIGRATION_FILE"

echo "Modified migration file. Now attempting to run migrations..."

# Run migrations
cd "$BACKEND_DIR"
alembic upgrade head

if [ $? -eq 0 ]; then
    echo "✅ Migrations completed successfully!"
else
    echo "❌ Migrations failed. Restoring original migration file..."
    cp "${MIGRATION_FILE}.bak" "$MIGRATION_FILE"
    echo "Original migration file restored. Please check the database manually."
    exit 1
fi

echo "Cleaning up backup files..."
rm -f "${MIGRATION_FILE}.bak"

echo "=== Database Migration Fix Complete ===" 