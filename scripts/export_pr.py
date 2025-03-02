#!/usr/bin/env python3
"""
Export script for PR review that collects all relevant code files
into a single concatenated file for easy review.
"""

import os
import argparse
import re
from datetime import datetime
from pathlib import Path
from typing import List, Tuple, Dict, Any, Optional

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
    "server.log",
    # Version control
    ".git",
    ".gitignore",
    "pr_review_*.txt",
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
    # Frontend specific
    "node_modules",
    ".next",
    ".turbo",
    ".cache",
    ".DS_Store",
    "*.min.js",
    "*.min.css",
    "*.map",
    ".eslintcache",
    ".stylelintcache",
    "yarn-error.log",
    "npm-debug.log*",
    "yarn-debug.log*",
    "yarn.lock",  # Lock files are typically not needed for review
    "package-lock.json",
    ".pnpm-store",
    "storybook-static",
    "public/assets",  # Often contains large binary assets
    "*.test.js.snap",  # Jest snapshots
    "__snapshots__",
    # Test directories
    "tests",
    "test",
    "__tests__",
    "spec",
    "specs",
    "cypress",
    "e2e",
    "**/*.test.js",
    "**/*.test.ts",
    "**/*.test.jsx",
    "**/*.test.tsx",
    "**/*.spec.js",
    "**/*.spec.ts",
    "**/*.spec.jsx",
    "**/*.spec.tsx",
    "**/*_test.go",
    "**/*_test.py",
    "**/test_*.py",
}

# Files to exclude by extension (non-functional code and binary files)
LARGE_FILE_EXTENSIONS = {
    # Image files - exclude all image formats
    ".jpg", ".jpeg", ".png", ".gif", ".ico", ".svg", ".webp", ".bmp", ".tiff", ".tif", ".psd",
    ".ai", ".eps", ".raw", ".cr2", ".nef", ".heif", ".heic", ".avif", ".jfif", ".exif",
    
    # Video files
    ".mp4", ".mov", ".avi", ".mkv", ".wmv", ".flv", ".webm", ".m4v", ".mpg", ".mpeg",
    ".3gp", ".3g2", ".ogv", ".vob", ".swf", ".asf",
    
    # Audio files
    ".mp3", ".wav", ".ogg", ".flac", ".aac", ".wma", ".m4a", ".aiff", ".alac",
    ".mid", ".midi", ".amr",
    
    # Document files
    ".pdf", ".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx", ".odt", ".ods", ".odp",
    ".pages", ".numbers", ".key", ".rtf", ".txt", ".md", ".csv", ".tsv",
    
    # Archive files
    ".zip", ".tar", ".gz", ".rar", ".7z", ".bz2", ".xz", ".iso", ".dmg",
    
    # Font files
    ".ttf", ".otf", ".woff", ".woff2", ".eot",
    
    # Data files
    ".json", ".xml", ".yaml", ".yml", ".toml", ".ini", ".db", ".sqlite", ".sqlite3",
    
    # Other binary files
    ".exe", ".dll", ".so", ".dylib", ".bin", ".dat", ".bak",
    
    # Generated files
    ".min.js", ".min.css", ".bundle.js", ".bundle.css",
    
    # Lockfiles
    ".lock", "lock.json",
}

# Files that must be included even if in excluded directories or have excluded extensions
FORCE_INCLUDE = {
    "README.md",
    "pyproject.toml",
    "package.json",  # Important for understanding dependencies
    "tsconfig.json", # Important for TypeScript configuration
    "alembic.ini",
    ".env.example",
    "docker-compose.yml", # Important for infrastructure
    "Dockerfile",         # Important for infrastructure
}

# Default size limits
DEFAULT_MAX_FILE_SIZE_KB = 500  # Skip files larger than this
DEFAULT_MAX_LINES_PER_FILE = 1000  # Truncate files with more lines than this
DEFAULT_MAX_TOTAL_FILES = 100  # Limit total number of files


def count_tokens(text: str) -> int:
    """
    Estimate the number of tokens in a text string.
    This is a simple approximation based on common tokenization patterns.
    
    For a more accurate count, you would need to use the specific tokenizer
    of the LLM you're targeting (e.g., tiktoken for OpenAI models).
    """
    # Simple approximation: split on whitespace and punctuation
    # This is a rough estimate that works reasonably well for English text
    # Use a simpler pattern that works across Python versions
    words = re.findall(r'\b\w+\b', text)
    
    # Count punctuation and special characters separately
    punctuation = re.findall(r'[^\w\s]', text)
    
    # Add an estimate for special tokens and potential subword tokenization
    # Typically, tokenizers split words into subwords, so actual token count is higher
    adjustment_factor = 1.3  # Adjust based on empirical testing
    
    return int((len(words) + len(punctuation)) * adjustment_factor)


def format_token_count(count: int) -> str:
    """Format token count with commas and add context window information."""
    formatted = f"{count:,}"
    
    # Add context window information for common LLMs
    context_info = []
    if count <= 4096:
        context_info.append("fits in GPT-3.5 (4K)")
    if count <= 8192:
        context_info.append("fits in Claude 2 (8K)")
    if count <= 16384:
        context_info.append("fits in GPT-4 (16K)")
    if count <= 32768:
        context_info.append("fits in Claude 3 Opus (32K)")
    if count <= 100000:
        context_info.append("fits in Claude 3 Sonnet (100K)")
    if count <= 200000:
        context_info.append("fits in Claude 3 Haiku (200K)")
    
    if context_info:
        return f"{formatted} ({', '.join(context_info)})"
    else:
        return f"{formatted} (exceeds standard context windows)"


def parse_args() -> Dict[str, Any]:
    """Parse command line arguments."""
    parser = argparse.ArgumentParser(description="Export PR code for review")
    
    parser.add_argument(
        "--max-file-size", 
        type=int, 
        default=DEFAULT_MAX_FILE_SIZE_KB,
        help=f"Maximum file size in KB (default: {DEFAULT_MAX_FILE_SIZE_KB})"
    )
    
    parser.add_argument(
        "--max-lines", 
        type=int, 
        default=DEFAULT_MAX_LINES_PER_FILE,
        help=f"Maximum lines per file before truncation (default: {DEFAULT_MAX_LINES_PER_FILE})"
    )
    
    parser.add_argument(
        "--max-files", 
        type=int, 
        default=DEFAULT_MAX_TOTAL_FILES,
        help=f"Maximum number of files to include (default: {DEFAULT_MAX_TOTAL_FILES})"
    )
    
    parser.add_argument(
        "--include-ext",
        type=str,
        nargs="+",
        help="File extensions to include (e.g., '.json .md') even if they would normally be excluded"
    )
    
    parser.add_argument(
        "--exclude-ext",
        type=str,
        nargs="+",
        help="Additional file extensions to exclude (e.g., '.css .scss')"
    )
    
    parser.add_argument(
        "--code-only",
        action="store_true",
        help="Include only source code files, excluding all documentation, configuration, and data files"
    )
    
    parser.add_argument(
        "--include-tests",
        action="store_true",
        help="Include test files and directories (excluded by default)"
    )
    
    args = parser.parse_args()
    
    config = {
        "max_file_size_kb": args.max_file_size,
        "max_lines_per_file": args.max_lines,
        "max_total_files": args.max_files,
        "include_extensions": set(ext.lower() if ext.startswith('.') else f'.{ext.lower()}' for ext in args.include_ext) if args.include_ext else set(),
        "exclude_extensions": set(ext.lower() if ext.startswith('.') else f'.{ext.lower()}' for ext in args.exclude_ext) if args.exclude_ext else set(),
        "code_only": args.code_only,
        "include_tests": args.include_tests
    }
    
    return config


def should_include_file(path: str, max_file_size_kb: int, config: Dict[str, Any] = None) -> bool:
    """Determine if a file should be included in the export."""
    if config is None:
        config = {}
        
    include_extensions = config.get("include_extensions", set())
    exclude_extensions = config.get("exclude_extensions", set())
    code_only = config.get("code_only", False)
    include_tests = config.get("include_tests", False)
    
    # Get the basename for pattern matching
    basename = os.path.basename(path)
    _, ext = os.path.splitext(basename)
    ext = ext.lower()
    
    # Always include forced files
    if basename in FORCE_INCLUDE:
        return True
    
    # Check for explicitly included extensions
    if ext in include_extensions:
        return True
        
    # Check for explicitly excluded extensions
    if ext in exclude_extensions:
        return False
    
    # Test file patterns
    test_patterns = [
        "test", "tests", "spec", "specs", "__tests__", "cypress", "e2e",
        ".test.", ".spec.", "_test.", "test_"
    ]
    
    # Check if this is a test file or directory
    is_test_file = any(pattern in path.lower() for pattern in test_patterns)
    
    # Skip test files unless explicitly included
    if is_test_file and not include_tests:
        return False
    
    # Source code extensions for code-only mode
    source_code_extensions = {
        # Web
        ".js", ".ts", ".jsx", ".tsx", ".vue", ".svelte", 
        ".html", ".htm", ".css", ".scss", ".sass", ".less",
        # Backend
        ".py", ".java", ".c", ".cpp", ".h", ".hpp", ".cs", 
        ".go", ".rs", ".php", ".rb", ".swift", ".kt", ".scala",
        # Shell/scripts
        ".sh", ".bash", ".zsh", ".ps1", ".bat", ".cmd",
        # Other
        ".sql", ".graphql", ".proto"
    }
    
    # In code-only mode, only include source code files
    if code_only and ext not in source_code_extensions:
        return False
    
    # Important configuration files that should be included despite extension
    important_config_patterns = [
        # Common configuration files
        "config.json", "config.yaml", "config.yml", "config.xml", "config.toml",
        ".eslintrc", ".prettierrc", ".babelrc", ".stylelintrc",
        "tsconfig.json", "jest.config", "webpack.config", "rollup.config",
        "next.config.js", "vite.config", "svelte.config", "nuxt.config",
        # Database related
        "schema.prisma", "migrations/*.sql", "alembic/versions/*.py",
        # CI/CD related
        ".github/workflows/*.yml", ".gitlab-ci.yml", "azure-pipelines.yml",
        "Jenkinsfile", ".circleci/config.yml",
    ]
    
    # Check if the file matches any important configuration pattern
    rel_path = os.path.relpath(path, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    for pattern in important_config_patterns:
        if "*" in pattern:
            # Simple glob pattern matching
            pattern_parts = pattern.split("*")
            if len(pattern_parts) == 2 and rel_path.startswith(pattern_parts[0]) and rel_path.endswith(pattern_parts[1]):
                return True
        elif pattern == rel_path or pattern == basename:
            return True
    
    # Skip files that are too large
    if os.path.isfile(path) and os.path.getsize(path) > max_file_size_kb * 1024:
        return False
        
    # Skip files with excluded extensions
    if ext in LARGE_FILE_EXTENSIONS:
        # Special case for source code files that might have been excluded
        if ext in source_code_extensions:
            return True
        return False

    # Check against exclusion patterns
    path_parts = Path(path).parts
    for excluded in EXCLUDED_PATHS:
        # Skip test directory check if include_tests is True
        if include_tests and excluded in ["tests", "test", "__tests__", "spec", "specs", "cypress", "e2e"]:
            continue
            
        # Skip test file pattern check if include_tests is True
        if include_tests and excluded.startswith("**/*") and any(p in excluded for p in [".test.", ".spec.", "_test.", "test_"]):
            continue
            
        # Handle wildcard patterns for files
        if excluded.startswith("*"):
            if basename.endswith(excluded[1:]):
                return False
        # Handle exact file matches
        elif excluded in path_parts or excluded == basename:
            return False

    return True


def collect_files(source_dir: str, config: Dict[str, Any]) -> List[Tuple[str, str]]:
    """Collect all relevant files and their relative paths."""
    files_to_export = []
    max_file_size_kb = config.get("max_file_size_kb", DEFAULT_MAX_FILE_SIZE_KB)
    max_total_files = config.get("max_total_files", DEFAULT_MAX_TOTAL_FILES)
    
    for root, dirs, files in os.walk(source_dir):
        # Skip excluded directories
        dirs[:] = [d for d in dirs if should_include_file(d, max_file_size_kb, config)]

        for file in files:
            source_path = os.path.join(root, file)
            if not should_include_file(source_path, max_file_size_kb, config):
                continue

            # Get relative path
            rel_path = os.path.relpath(source_path, source_dir)
            files_to_export.append((source_path, rel_path))
            
            # Limit total number of files
            if len(files_to_export) >= max_total_files:
                print(f"\nWARNING: Reached maximum file limit ({max_total_files}). Some files will be omitted.")
                break

    # Sort files by path for consistent output
    return sorted(files_to_export, key=lambda x: x[1])


def truncate_content(content: str, max_lines: int) -> Tuple[str, bool]:
    """Truncate file content if it exceeds max_lines."""
    lines = content.splitlines()
    was_truncated = len(lines) > max_lines
    
    if was_truncated:
        half = max_lines // 2
        # Keep first and last parts of the file
        truncated_lines = lines[:half] + [
            "\n\n[...TRUNCATED...]\n",
            f"[{len(lines) - max_lines} lines omitted for brevity]\n",
            "\n"
        ] + lines[-half:]
        return "\n".join(truncated_lines), True
    
    return content, False


def create_export_file(files: List[Tuple[str, str]], export_path: str, config: Dict[str, Any]) -> int:
    """Create a single file containing all code with separators."""
    max_lines = config.get("max_lines_per_file", DEFAULT_MAX_LINES_PER_FILE)
    
    # First pass: collect all content to calculate total tokens
    all_content = []
    file_token_counts = {}
    
    for source_path, rel_path in files:
        try:
            with open(source_path, "r", encoding="utf-8") as source_file:
                content = source_file.read()
                
                # Truncate if needed
                content, was_truncated = truncate_content(content, max_lines)
                
                # Store content and calculate tokens
                file_token_counts[rel_path] = count_tokens(content)
                all_content.append(content)
                
        except Exception as e:
            all_content.append(f"ERROR: Could not read file: {str(e)}")
    
    # Calculate total tokens
    total_content = "\n\n".join(all_content)
    total_tokens = count_tokens(total_content)
    formatted_token_count = format_token_count(total_tokens)
    
    # Second pass: write the file with token information
    with open(export_path, "w", encoding="utf-8") as export_file:
        # Write header
        export_file.write("=" * 80 + "\n")
        export_file.write("PeerAI - Code Review Export\n")
        export_file.write(
            f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n"
        )
        export_file.write(f"Total tokens: {formatted_token_count}\n")
        export_file.write("=" * 80 + "\n\n")
        
        # Write summary of configuration
        export_file.write("EXPORT CONFIGURATION:\n")
        export_file.write(f"- Max file size: {config['max_file_size_kb']} KB\n")
        export_file.write(f"- Max lines per file: {config['max_lines_per_file']}\n")
        export_file.write(f"- Max total files: {config['max_total_files']}\n")
        export_file.write(f"- Include test files: {'Yes' if config.get('include_tests') else 'No'}\n")
        
        # Add file type filtering configuration
        if config.get("code_only"):
            export_file.write("- Mode: Code files only\n")
            
        if config.get("include_extensions"):
            export_file.write(f"- Explicitly included extensions: {', '.join(sorted(config['include_extensions']))}\n")
            
        if config.get("exclude_extensions"):
            export_file.write(f"- Additionally excluded extensions: {', '.join(sorted(config['exclude_extensions']))}\n")
            
        export_file.write("=" * 80 + "\n\n")
        
        # Write file contents
        for i, (source_path, rel_path) in enumerate(files):
            # Write file separator with token count
            export_file.write("=" * 80 + "\n")
            token_count = file_token_counts.get(rel_path, "unknown")
            export_file.write(f"FILE: {rel_path} ({token_count} tokens)\n")
            export_file.write("=" * 80 + "\n\n")

            try:
                # Read and write file contents
                with open(source_path, "r", encoding="utf-8") as source_file:
                    content = source_file.read()
                    
                    # Truncate if needed
                    content, was_truncated = truncate_content(content, max_lines)
                    
                    export_file.write(content)
                    
                    if was_truncated:
                        export_file.write("\n\n[File was truncated due to length]\n")

                # Add newlines between files
                export_file.write("\n\n")

            except Exception as e:
                export_file.write(f"ERROR: Could not read file: {str(e)}\n\n")
                
    # Return the total token count for use in the main function
    return total_tokens


def main():
    # Parse command line arguments
    config = parse_args()
    
    # Get workspace root (assuming script is in scripts/ directory)
    workspace_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

    # Create export filename with timestamp
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    export_path = os.path.join(workspace_root, f"pr_review_{timestamp}.txt")

    print("\nCollecting files for PR review...")
    print("=" * 80)
    print(f"Configuration:")
    print(f"- Max file size: {config['max_file_size_kb']} KB")
    print(f"- Max lines per file: {config['max_lines_per_file']}")
    print(f"- Max total files: {config['max_total_files']}")
    
    # Display file type filtering configuration
    if config.get("code_only"):
        print("- Mode: Code files only")
    
    print(f"- Include test files: {'Yes' if config.get('include_tests') else 'No'}")
        
    if config.get("include_extensions"):
        print(f"- Explicitly included extensions: {', '.join(sorted(config['include_extensions']))}")
        
    if config.get("exclude_extensions"):
        print(f"- Additionally excluded extensions: {', '.join(sorted(config['exclude_extensions']))}")
        
    print("=" * 80)

    try:
        # Collect all files
        files = collect_files(workspace_root, config)

        # Create export file and get token count
        total_tokens = create_export_file(files, export_path, config)
        
        # Get file size in KB
        file_size_kb = os.path.getsize(export_path) / 1024
        
        # Format token count for display
        formatted_token_count = format_token_count(total_tokens)

        print(f"\nExported {len(files)} files to: {export_path}")
        print(f"Export file size: {file_size_kb:.2f} KB")
        print(f"Estimated token count: {formatted_token_count}")
        
        # Print file extension statistics
        extension_counts = {}
        for source_path, _ in files:
            ext = os.path.splitext(source_path)[1].lower()
            extension_counts[ext] = extension_counts.get(ext, 0) + 1
            
        if extension_counts:
            print("\nFile types included:")
            for ext, count in sorted(extension_counts.items(), key=lambda x: x[1], reverse=True):
                if ext:  # Skip files with no extension
                    print(f"- {ext}: {count} files")
        
        print("\nFiles included:")
        for _, rel_path in files:
            print(f"- {rel_path}")

    except Exception as e:
        print(f"\nError during export: {str(e)}")
        return 1

    return 0


if __name__ == "__main__":
    exit(main())
