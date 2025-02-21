#!/bin/bash

# Export PR review files into a single concatenated file
# This script is a wrapper around the Python export script

# Get the directory where this script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Make sure the Python script is executable
chmod +x "${SCRIPT_DIR}/export_pr.py"

# Run the Python script
"${SCRIPT_DIR}/export_pr.py"

# Check if export was successful
if [ $? -eq 0 ]; then
    echo -e "\n✅ Export completed successfully!"
    
    # Find the most recent export file
    EXPORT_FILE=$(ls -t pr_review_*.txt | head -n1)
    
    if [ -n "$EXPORT_FILE" ]; then
        echo -e "\nYou can review the code using:"
        echo "less ${EXPORT_FILE}"
        echo -e "\nOr open it in your preferred text editor.\n"
    fi
else
    echo -e "\n❌ Export failed!"
    exit 1
fi 