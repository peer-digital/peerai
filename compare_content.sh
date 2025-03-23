#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test URLs
LOCAL_URL="http://localhost:3000"
PROD_URL="http://158.174.210.91"

# Test endpoint
ENDPOINT="/login"

echo "Comparing HTML content between environments..."
echo "----------------------------------------"

# Create temporary files for responses
local_file=$(mktemp)
prod_file=$(mktemp)

# Get responses without headers
curl -s "$LOCAL_URL$ENDPOINT" > "$local_file"
curl -s "$PROD_URL$ENDPOINT" > "$prod_file"

# Compare files and show differences
echo -e "${YELLOW}Differences found:${NC}"
diff "$local_file" "$prod_file" | grep -v "^[0-9]" | grep -v "^---" | grep -v "^a" | grep -v "^d"

# Clean up
rm "$local_file" "$prod_file" 