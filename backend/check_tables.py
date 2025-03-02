from database import engine
import sqlalchemy as sa

with engine.connect() as conn:
    print('All tables:')
    result = conn.execute(sa.text('SELECT table_name FROM information_schema.tables WHERE table_schema = \'public\''))
    tables = [row[0] for row in result.fetchall()]
    print(tables)
    
    if 'ai_models' in tables:
        print('\nAI Models:')
        result = conn.execute(sa.text('SELECT id, name, display_name, provider_id, model_type, is_default FROM ai_models'))
        for row in result.fetchall():
            print(row)
    
    if 'model_providers' in tables:
        print('\nModel Providers:')
        result = conn.execute(sa.text('SELECT id, name, display_name, api_base_url FROM model_providers'))
        for row in result.fetchall():
            print(row)
    
    if 'model_request_mappings' in tables:
        print('\nModel Request Mappings:')
        result = conn.execute(sa.text('SELECT id, model_id, peer_param, provider_param, transform_function FROM model_request_mappings'))
        for row in result.fetchall():
            print(row) 