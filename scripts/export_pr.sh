#!/bin/bash

# Export PR review files into a single concatenated file
# This script is a wrapper around the Python export script

# Function to display help
show_help() {
    echo "Usage: $0 [options]"
    echo ""
    echo "Options:"
    echo "  --max-file-size SIZE  Maximum file size in KB (default: 500)"
    echo "  --max-lines LINES     Maximum lines per file before truncation (default: 1000)"
    echo "  --max-files COUNT     Maximum number of files to include (default: 100)"
    echo "  --include-ext EXT     File extensions to include even if normally excluded"
    echo "                        (e.g., '--include-ext json yml')"
    echo "  --exclude-ext EXT     Additional file extensions to exclude"
    echo "                        (e.g., '--exclude-ext css scss')"
    echo "  --code-only           Include only source code files, excluding documentation,"
    echo "                        configuration, and data files"
    echo "  --include-tests       Include test files and directories (excluded by default)"
    echo "  -h, --help            Display this help message"
    echo ""
    echo "Features:"
    echo "  - Excludes binary files, images, and other non-functional code by default"
    echo "  - Excludes test files and directories by default (use --include-tests to include)"
    echo "  - Truncates large files to keep export size manageable"
    echo "  - Calculates token count for LLM context window compatibility"
    echo "  - Provides file type statistics for better understanding of codebase"
    echo ""
    echo "Examples:"
    echo "  $0 --max-file-size 300 --max-lines 500 --max-files 50"
    echo "  $0 --code-only --exclude-ext css scss"
    echo "  $0 --include-ext json yml --exclude-ext svg png jpg"
    echo "  $0 --include-tests --code-only"
}

# Parse command line arguments
if [[ "$1" == "-h" || "$1" == "--help" ]]; then
    show_help
    exit 0
fi

# Get the directory where this script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Make sure the Python script is executable
chmod +x "${SCRIPT_DIR}/export_pr.py"

# Run the Python script with all arguments passed through
"${SCRIPT_DIR}/export_pr.py" "$@"

# Check if export was successful
if [ $? -eq 0 ]; then
    echo -e "\n✅ Export completed successfully!"
    
    # Find the most recent export file
    EXPORT_FILE=$(ls -t pr_review_*.txt | head -n1)
    
    if [ -n "$EXPORT_FILE" ]; then
        echo -e "\nYou can review the code using:"
        echo "less ${EXPORT_FILE}"
        echo -e "\nOr open it in your preferred text editor.\n"
        echo "The file includes token count information for LLM context compatibility."
    fi
else
    echo -e "\n❌ Export failed!"
    exit 1
fi 