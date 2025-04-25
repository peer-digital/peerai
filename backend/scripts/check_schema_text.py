"""
Script to check the database schema using SQLAlchemy text.
"""
from backend.database import engine
from sqlalchemy import text

def check_schema():
    """Check the database schema using SQLAlchemy text."""
    with engine.connect() as conn:
        # Get table names
        result = conn.execute(text("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'"))
        tables = [row[0] for row in result]
        print('Tables:', tables)
        
        # Get columns for app_templates
        result = conn.execute(text("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'app_templates'"))
        columns = [(row[0], row[1]) for row in result]
        print('app_templates columns:')
        for column_name, data_type in columns:
            print(f"  - {column_name}: {data_type}")

if __name__ == "__main__":
    check_schema()
