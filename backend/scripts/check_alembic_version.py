import os
from sqlalchemy import create_engine, text

# Get the database URL from environment variable
database_url = os.getenv('DATABASE_URL', 'postgresql://postgres:postgres@localhost:5432/peerai')

# Create engine
engine = create_engine(database_url)

# Query the alembic_version table
with engine.connect() as connection:
    result = connection.execute(text('SELECT version_num FROM alembic_version')).fetchone()
    if result:
        print(f"Current version in database: {result[0]}")
    else:
        print("No version found in alembic_version table") 