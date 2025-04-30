"""Add RAG tables

Revision ID: add_rag_tables
Revises: add_deployed_apps_table
Create Date: 2023-07-01 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'add_rag_tables'
down_revision = 'add_deployed_apps_table'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create rag_indexes table
    op.create_table(
        'rag_indexes',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('user_id', sa.Integer(), nullable=True),
        sa.Column('team_id', sa.Integer(), nullable=True),
        sa.Column('deployed_app_id', sa.Integer(), nullable=True),
        sa.Column('embedding_model', sa.String(), nullable=False, server_default='mistral-embed'),
        sa.Column('chunk_size', sa.Integer(), nullable=False, server_default='1000'),
        sa.Column('chunk_overlap', sa.Integer(), nullable=False, server_default='200'),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('now()')),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.text('now()')),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('index_metadata', sa.JSON(), nullable=True),
        sa.ForeignKeyConstraint(['deployed_app_id'], ['deployed_apps.id'], ),
        sa.ForeignKeyConstraint(['team_id'], ['teams.id'], ),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_rag_indexes_id'), 'rag_indexes', ['id'], unique=False)

    # Create rag_documents table
    op.create_table(
        'rag_documents',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('index_id', sa.Integer(), nullable=False),
        sa.Column('filename', sa.String(), nullable=False),
        sa.Column('file_type', sa.String(), nullable=False),
        sa.Column('file_size', sa.Integer(), nullable=False),
        sa.Column('content_type', sa.String(), nullable=True),
        sa.Column('content', sa.Text(), nullable=True),
        sa.Column('external_id', sa.String(), nullable=True),
        sa.Column('is_processed', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('now()')),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.text('now()')),
        sa.Column('doc_metadata', sa.JSON(), nullable=True),
        sa.ForeignKeyConstraint(['index_id'], ['rag_indexes.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_rag_documents_id'), 'rag_documents', ['id'], unique=False)

    # Create rag_document_chunks table
    op.create_table(
        'rag_document_chunks',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('document_id', sa.Integer(), nullable=False),
        sa.Column('chunk_index', sa.Integer(), nullable=False),
        sa.Column('text', sa.Text(), nullable=False),
        sa.Column('embedding', postgresql.ARRAY(sa.Float()), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('now()')),
        sa.Column('chunk_metadata', sa.JSON(), nullable=True),
        sa.ForeignKeyConstraint(['document_id'], ['rag_documents.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_rag_document_chunks_id'), 'rag_document_chunks', ['id'], unique=False)


def downgrade() -> None:
    # Drop tables in reverse order
    op.drop_table('rag_document_chunks')
    op.drop_table('rag_documents')
    op.drop_table('rag_indexes')
