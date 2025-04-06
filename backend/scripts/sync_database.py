#!/usr/bin/env python
"""
Database Schema Synchronization Script

This script helps new developers sync their database schema with the latest migrations.
It runs Alembic migrations to bring the database schema up to date.

Usage:
    python -m backend.scripts.sync_database

Environment Variables:
    DATABASE_URL: The database connection string (required)
    Example: postgresql://peerai:peerai_password@localhost:5432/peerai_db
"""

import os
import sys
import subprocess
from pathlib import Path
from sqlalchemy import create_engine, text
from sqlalchemy.exc import SQLAlchemyError
from dotenv import load_dotenv

# Add the parent directory to PYTHONPATH
current_dir = Path(__file__).parent.parent
sys.path.insert(0, str(current_dir))

# Load environment variables from .env file if it exists
dotenv_path = current_dir / ".env"
load_dotenv(dotenv_path)

# Get database URL from environment variable
DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    print("\n❌ ERROR: DATABASE_URL environment variable is not set.")
    print("Please set the DATABASE_URL environment variable or create a .env file with it.")
    print("Example: DATABASE_URL=postgresql://peerai:peerai_password@localhost:5432/peerai_db\n")
    sys.exit(1)

def check_database_connection():
    """Check if the database is accessible."""
    print("\n🔍 Checking database connection...")
    
    engine = create_engine(DATABASE_URL)
    try:
        with engine.connect() as connection:
            connection.execute(text("SELECT 1"))
        print("✅ Database connection successful!")
        return True
    except SQLAlchemyError as e:
        print(f"❌ Database connection failed: {str(e)}")
        return False

def check_alembic_version():
    """Check the current Alembic version in the database."""
    print("\n🔍 Checking current Alembic version...")
    
    engine = create_engine(DATABASE_URL)
    try:
        with engine.connect() as connection:
            # Check if alembic_version table exists
            result = connection.execute(text(
                "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'alembic_version')"
            )).scalar()
            
            if not result:
                print("ℹ️ No alembic_version table found. This might be a new database.")
                return None
            
            # Get current version
            result = connection.execute(text("SELECT version_num FROM alembic_version")).fetchone()
            if result:
                version = result[0]
                print(f"✅ Current database version: {version}")
                return version
            else:
                print("ℹ️ No version found in alembic_version table.")
                return None
    except SQLAlchemyError as e:
        print(f"❌ Error checking Alembic version: {str(e)}")
        return None

def run_alembic_migrations():
    """Run Alembic migrations to update the database schema."""
    print("\n🔄 Running database migrations...")
    
    # Set PYTHONPATH to include the project root
    env = os.environ.copy()
    env["PYTHONPATH"] = f"{env.get('PYTHONPATH', '')}:{str(Path(__file__).parent.parent.parent)}"
    
    try:
        # First, stamp the current version to ensure we're in a known state
        print("ℹ️ Stamping current version...")
        subprocess.run(
            ["alembic", "stamp", "head"],
            cwd=str(Path(__file__).parent.parent.parent),
            env=env,
            check=False
        )
        
        # Then run the migrations
        print("ℹ️ Running migrations...")
        result = subprocess.run(
            ["alembic", "upgrade", "head"],
            cwd=str(Path(__file__).parent.parent.parent),
            env=env,
            check=True,
            capture_output=True,
            text=True
        )
        
        print(result.stdout)
        if result.stderr:
            print(f"⚠️ Warnings: {result.stderr}")
        
        print("✅ Database migrations completed successfully!")
        return True
    except subprocess.CalledProcessError as e:
        print(f"❌ Error running migrations: {e}")
        print(f"Output: {e.stdout}")
        print(f"Error: {e.stderr}")
        return False

def main():
    """Main function to sync the database schema."""
    print("\n🚀 Starting database schema synchronization...")
    
    # Check database connection
    if not check_database_connection():
        print("\n❌ Cannot proceed without database connection. Please check your DATABASE_URL.")
        sys.exit(1)
    
    # Check current Alembic version
    current_version = check_alembic_version()
    
    # Run migrations
    if run_alembic_migrations():
        # Check new version after migrations
        new_version = check_alembic_version()
        
        if current_version != new_version:
            print(f"\n✅ Database schema updated from version {current_version} to {new_version}!")
        else:
            print("\n✅ Database schema is already up to date!")
    else:
        print("\n❌ Failed to update database schema. Please check the errors above.")
        sys.exit(1)
    
    print("\n🎉 Database schema synchronization completed!")
    print("You can now start using the application with the latest database schema.")

if __name__ == "__main__":
    main()
