"""
add deployed_apps table

Revision ID: add_deployed_apps_table
Revises: 5b7a1ccd6324
Create Date: 2025-04-17 19:00:00.000000
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'add_deployed_apps_table'
down_revision = '5b7a1ccd6324'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create app_templates table if it doesn't exist
    op.execute("""
    CREATE TABLE IF NOT EXISTS app_templates (
        id SERIAL PRIMARY KEY,
        slug VARCHAR NOT NULL UNIQUE,
        name VARCHAR NOT NULL,
        description TEXT,
        icon_url VARCHAR,
        template_config JSONB NOT NULL,
        template_code TEXT NOT NULL,
        tags JSONB,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
    """)
    
    # Create teams table if it doesn't exist
    op.execute("""
    CREATE TABLE IF NOT EXISTS teams (
        id SERIAL PRIMARY KEY,
        name VARCHAR NOT NULL,
        created_at TIMESTAMP,
        created_by_id INTEGER REFERENCES users(id)
    )
    """)
    
    # Create deployed_apps table
    op.execute("""
    CREATE TABLE IF NOT EXISTS deployed_apps (
        id SERIAL PRIMARY KEY,
        template_id INTEGER NOT NULL REFERENCES app_templates(id),
        team_id INTEGER REFERENCES teams(id),
        deployed_by_id INTEGER NOT NULL REFERENCES users(id),
        name VARCHAR NOT NULL,
        slug VARCHAR NOT NULL UNIQUE,
        configuration JSONB,
        custom_code TEXT,
        public_url VARCHAR,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
    """)


def downgrade() -> None:
    # Drop deployed_apps table
    op.drop_table('deployed_apps')
