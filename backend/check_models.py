from database import engine
import sqlalchemy as sa
from sqlalchemy.sql import text

print('AI Models in database:')
with engine.connect() as conn:
    result = conn.execute(text('SELECT id, name, display_name, provider_id, status FROM ai_models'))
    for row in result:
        print(row)
        
print('\nModel Providers:')
with engine.connect() as conn:
    result = conn.execute(text('SELECT id, name, display_name, api_base_url FROM model_providers'))
    for row in result:
        print(row) 