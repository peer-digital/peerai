"""
Script to directly create the model registry tables in the database.
This is a workaround for the alembic migration issue.
"""

from database import engine
import sqlalchemy as sa
from sqlalchemy import MetaData, Table, Column, Integer, String, Boolean, Float, JSON, ForeignKey, text
from sqlalchemy.sql import text as sa_text

def create_tables():
    """Create the model registry tables directly."""
    print("Creating model registry tables...")
    
    metadata = MetaData()
    
    # Define model_providers table
    model_providers = Table(
        'model_providers', 
        metadata,
        Column('id', Integer, primary_key=True),
        Column('name', String, nullable=False, unique=True),
        Column('display_name', String, nullable=False),
        Column('api_base_url', String, nullable=False),
        Column('api_key_env_var', String, nullable=False),
        Column('is_active', Boolean, default=True),
        Column('created_at', sa.TIMESTAMP, server_default=text('NOW()'), nullable=False),
        Column('updated_at', sa.TIMESTAMP, server_default=text('NOW()'), nullable=False),
        Column('config', JSON, nullable=True),
    )
    
    # Define ai_models table
    ai_models = Table(
        'ai_models', 
        metadata,
        Column('id', Integer, primary_key=True),
        Column('name', String, nullable=False),
        Column('display_name', String, nullable=False),
        Column('provider_id', Integer, ForeignKey('model_providers.id'), nullable=False),
        Column('model_type', String, nullable=False),
        Column('capabilities', JSON, nullable=True),
        Column('context_window', Integer, nullable=True),
        Column('status', String, default='active'),
        Column('is_default', Boolean, default=False),
        Column('cost_per_1k_input_tokens', Float, default=0.0),
        Column('cost_per_1k_output_tokens', Float, default=0.0),
        Column('created_at', sa.TIMESTAMP, server_default=text('NOW()'), nullable=False),
        Column('updated_at', sa.TIMESTAMP, server_default=text('NOW()'), nullable=False),
        Column('config', JSON, nullable=True),
    )
    
    # Define model_request_mappings table
    model_request_mappings = Table(
        'model_request_mappings', 
        metadata,
        Column('id', Integer, primary_key=True),
        Column('model_id', Integer, ForeignKey('ai_models.id'), nullable=False),
        Column('peer_param', String, nullable=False),
        Column('provider_param', String, nullable=False),
        Column('transform_function', String, nullable=True),
        Column('created_at', sa.TIMESTAMP, server_default=text('NOW()'), nullable=False),
        Column('updated_at', sa.TIMESTAMP, server_default=text('NOW()'), nullable=False),
    )
    
    # Create tables
    try:
        with engine.connect() as conn:
            # Create model_providers table
            print("Creating model_providers table...")
            conn.execute(sa_text("""
                CREATE TABLE IF NOT EXISTS model_providers (
                    id SERIAL PRIMARY KEY,
                    name VARCHAR NOT NULL UNIQUE,
                    display_name VARCHAR NOT NULL,
                    api_base_url VARCHAR NOT NULL,
                    api_key_env_var VARCHAR NOT NULL,
                    is_active BOOLEAN DEFAULT TRUE,
                    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
                    updated_at TIMESTAMP DEFAULT NOW() NOT NULL,
                    config JSONB
                )
            """))
            conn.commit()
            print("model_providers table created successfully.")
            
            # Create ai_models table
            print("Creating ai_models table...")
            conn.execute(sa_text("""
                CREATE TABLE IF NOT EXISTS ai_models (
                    id SERIAL PRIMARY KEY,
                    name VARCHAR NOT NULL,
                    display_name VARCHAR NOT NULL,
                    provider_id INTEGER NOT NULL REFERENCES model_providers(id),
                    model_type VARCHAR NOT NULL,
                    capabilities JSONB,
                    context_window INTEGER,
                    status VARCHAR DEFAULT 'active',
                    is_default BOOLEAN DEFAULT FALSE,
                    cost_per_1k_input_tokens FLOAT DEFAULT 0.0,
                    cost_per_1k_output_tokens FLOAT DEFAULT 0.0,
                    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
                    updated_at TIMESTAMP DEFAULT NOW() NOT NULL,
                    config JSONB
                )
            """))
            conn.commit()
            print("ai_models table created successfully.")
            
            # Create model_request_mappings table
            print("Creating model_request_mappings table...")
            conn.execute(sa_text("""
                CREATE TABLE IF NOT EXISTS model_request_mappings (
                    id SERIAL PRIMARY KEY,
                    model_id INTEGER NOT NULL REFERENCES ai_models(id),
                    peer_param VARCHAR NOT NULL,
                    provider_param VARCHAR NOT NULL,
                    transform_function VARCHAR,
                    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
                    updated_at TIMESTAMP DEFAULT NOW() NOT NULL
                )
            """))
            conn.commit()
            print("model_request_mappings table created successfully.")
            
            # Insert default providers
            print("Inserting default providers...")
            conn.execute(sa_text("""
                INSERT INTO model_providers (name, display_name, api_base_url, api_key_env_var, is_active, config)
                VALUES 
                ('hosted', 'Hosted LLM', 'https://llm-api.bahnhof.se/v1/completions', 'HOSTED_LLM_API_KEY', true, '{"request_format": "direct"}'),
                ('mistral', 'Mistral AI', 'https://api.mistral.ai/v1/chat/completions', 'EXTERNAL_LLM_API_KEY', true, '{"request_format": "chat"}')
            """))
            conn.commit()
            print("Default providers inserted successfully.")
            
            # Get provider IDs
            hosted_result = conn.execute(sa_text("SELECT id FROM model_providers WHERE name = 'hosted'"))
            hosted_id = hosted_result.fetchone()[0]
            
            mistral_result = conn.execute(sa_text("SELECT id FROM model_providers WHERE name = 'mistral'"))
            mistral_id = mistral_result.fetchone()[0]
            
            # Insert default models
            print("Inserting default models...")
            conn.execute(sa_text(f"""
                INSERT INTO ai_models (name, display_name, provider_id, model_type, capabilities, context_window, status, is_default, cost_per_1k_input_tokens, cost_per_1k_output_tokens, config)
                VALUES 
                ('hosted-llm', 'Hosted LLM', {hosted_id}, 'text', '["completion"]', 8192, 'active', true, 0.0, 0.0, '{{}}'),
                ('mistral-tiny', 'Mistral Tiny', {mistral_id}, 'text', '["chat", "completion"]', 32000, 'active', false, 0.14, 0.42, '{{}}'),
                ('mistral-small', 'Mistral Small', {mistral_id}, 'text', '["chat", "completion"]', 32000, 'active', false, 0.6, 1.8, '{{}}'),
                ('mistral-medium', 'Mistral Medium', {mistral_id}, 'text', '["chat", "completion"]', 32000, 'active', false, 2.7, 8.1, '{{}}')
            """))
            conn.commit()
            print("Default models inserted successfully.")
            
            # Get model IDs
            hosted_model_result = conn.execute(sa_text("SELECT id FROM ai_models WHERE name = 'hosted-llm'"))
            hosted_model_id = hosted_model_result.fetchone()[0]
            
            mistral_tiny_result = conn.execute(sa_text("SELECT id FROM ai_models WHERE name = 'mistral-tiny'"))
            mistral_tiny_id = mistral_tiny_result.fetchone()[0]
            
            # Insert parameter mappings for hosted model
            print("Inserting parameter mappings for hosted model...")
            conn.execute(sa_text(f"""
                INSERT INTO model_request_mappings (model_id, peer_param, provider_param)
                VALUES 
                ({hosted_model_id}, 'prompt', 'prompt'),
                ({hosted_model_id}, 'max_tokens', 'max_tokens'),
                ({hosted_model_id}, 'temperature', 'temperature')
            """))
            conn.commit()
            print("Parameter mappings for hosted model inserted successfully.")
            
            # Insert parameter mappings for Mistral models
            print("Inserting parameter mappings for Mistral models...")
            conn.execute(sa_text(f"""
                INSERT INTO model_request_mappings (model_id, peer_param, provider_param, transform_function)
                VALUES 
                ({mistral_tiny_id}, 'prompt', 'messages', 'format_as_chat_message'),
                ({mistral_tiny_id}, 'max_tokens', 'max_tokens', NULL),
                ({mistral_tiny_id}, 'temperature', 'temperature', NULL),
                ({mistral_tiny_id}, 'top_p', 'top_p', NULL),
                ({mistral_tiny_id}, 'stop', 'stop', NULL),
                ({mistral_tiny_id}, 'random_seed', 'random_seed', NULL),
                ({mistral_tiny_id}, 'safe_prompt', 'safe_prompt', NULL),
                ({mistral_tiny_id}, 'presence_penalty', 'presence_penalty', NULL),
                ({mistral_tiny_id}, 'frequency_penalty', 'frequency_penalty', NULL)
            """))
            conn.commit()
            print("Parameter mappings for Mistral models inserted successfully.")
            
    except Exception as e:
        print(f"Error: {str(e)}")

if __name__ == "__main__":
    create_tables() 