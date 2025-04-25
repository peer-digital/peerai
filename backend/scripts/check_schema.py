"""
Script to check the database schema.
"""
from backend.database import engine
import sqlalchemy as sa

def check_schema():
    """Check the database schema."""
    metadata = sa.MetaData()
    metadata.reflect(bind=engine)
    
    print('Tables:', list(metadata.tables.keys()))
    
    app_templates = metadata.tables.get('app_templates')
    if app_templates:
        print('app_templates columns:')
        for column in app_templates.columns:
            print(f"  - {column.name}: {column.type}")
    else:
        print('app_templates table not found')

if __name__ == "__main__":
    check_schema()
