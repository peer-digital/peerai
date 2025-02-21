#!/usr/bin/env python3
"""
Export script for PR review that collects all relevant code files
into a single concatenated file for easy review.
"""

import os
import shutil
from datetime import datetime
from pathlib import Path
from typing import Set, List, Tuple

# Files and directories to exclude from export
EXCLUDED_PATHS = {
    # Environment and local config
    ".env",
    ".env.*",
    "*.pyc",
    "__pycache__",
    ".pytest_cache",
    ".coverage",
    "*.log",
    
    # Virtual environment
    "venv",
    "env",
    ".venv",
    
    # IDE specific
    ".idea",
    ".vscode",
    "*.swp",
    
    # Build artifacts
    "dist",
    "build",
    "*.egg-info",
    
    # Local development
    "local_*",
    "dev_*",
    
    # Temporary files
    "tmp",
    "temp",
    "*~",
    
    # Export script itself
    "scripts/export_pr.py",
    "scripts/export_pr.sh",
}

# Files that must be included even if in excluded directories
FORCE_INCLUDE = {
    "README.md",
    "pyproject.toml",
    "alembic.ini",
    ".env.example",
}

def should_include_file(path: str) -> bool:
    """Determine if a file should be included in the export."""
    # Always include forced files
    if os.path.basename(path) in FORCE_INCLUDE:
        return True
        
    # Check against exclusion patterns
    path_parts = Path(path).parts
    for excluded in EXCLUDED_PATHS:
        if any(part.startswith(excluded.replace("*", "")) for part in path_parts):
            return False
    
    return True

def collect_files(source_dir: str) -> List[Tuple[str, str]]:
    """Collect all relevant files and their relative paths."""
    files_to_export = []
    
    for root, dirs, files in os.walk(source_dir):
        # Skip excluded directories
        dirs[:] = [d for d in dirs if should_include_file(d)]
        
        for file in files:
            source_path = os.path.join(root, file)
            if not should_include_file(source_path):
                continue
                
            # Get relative path
            rel_path = os.path.relpath(source_path, source_dir)
            files_to_export.append((source_path, rel_path))
    
    # Sort files by path for consistent output
    return sorted(files_to_export, key=lambda x: x[1])

def create_export_file(files: List[Tuple[str, str]], export_path: str) -> None:
    """Create a single file containing all code with separators."""
    with open(export_path, 'w', encoding='utf-8') as export_file:
        # Write header
        export_file.write("=" * 80 + "\n")
        export_file.write("PeerAI - Code Review Export\n")
        export_file.write(f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
        export_file.write("=" * 80 + "\n\n")
        
        # Write file contents
        for source_path, rel_path in files:
            # Write file separator
            export_file.write("=" * 80 + "\n")
            export_file.write(f"FILE: {rel_path}\n")
            export_file.write("=" * 80 + "\n\n")
            
            try:
                # Read and write file contents
                with open(source_path, 'r', encoding='utf-8') as source_file:
                    content = source_file.read()
                    export_file.write(content)
                    
                # Add newlines between files
                export_file.write("\n\n")
                
            except Exception as e:
                export_file.write(f"ERROR: Could not read file: {str(e)}\n\n")

def main():
    # Get workspace root (assuming script is in scripts/ directory)
    workspace_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    
    # Create export filename with timestamp
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    export_path = os.path.join(workspace_root, f"pr_review_{timestamp}.txt")
    
    print(f"\nCollecting files for PR review...")
    print("=" * 80)
    
    try:
        # Collect all files
        files = collect_files(workspace_root)
        
        # Create export file
        create_export_file(files, export_path)
        
        print(f"\nExported {len(files)} files to: {export_path}")
        print("\nFiles included:")
        for _, rel_path in files:
            print(f"- {rel_path}")
        
    except Exception as e:
        print(f"\nError during export: {str(e)}")
        return 1
        
    return 0

if __name__ == "__main__":
    exit(main()) 