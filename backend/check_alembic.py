from database import engine
import sqlalchemy as sa
from sqlalchemy.sql import text

print('Current alembic_version table contents:')
with engine.connect() as conn:
    result = conn.execute(text('SELECT * FROM alembic_version'))
    for row in result:
        print(row)
        
print('\nAll tables:')
with engine.connect() as conn:
    result = conn.execute(text("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'"))
    for row in result:
        print(row[0]) 