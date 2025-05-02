-- Create documents table
CREATE TABLE IF NOT EXISTS documents (
    id SERIAL PRIMARY KEY,
    filename VARCHAR NOT NULL,
    content_type VARCHAR NOT NULL,
    size_bytes INTEGER NOT NULL,
    uploaded_by_id INTEGER NOT NULL REFERENCES users(id),
    team_id INTEGER REFERENCES teams(id),
    storage_path VARCHAR NOT NULL,
    is_processed BOOLEAN NOT NULL DEFAULT false,
    processing_error TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create index on documents
CREATE INDEX IF NOT EXISTS ix_documents_id ON documents (id);

-- Create document_chunks table
CREATE TABLE IF NOT EXISTS document_chunks (
    id SERIAL PRIMARY KEY,
    document_id INTEGER NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    chunk_index INTEGER NOT NULL,
    text TEXT NOT NULL,
    embedding FLOAT[] NULL,
    chunk_metadata JSONB NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create indexes on document_chunks
CREATE INDEX IF NOT EXISTS ix_document_chunks_id ON document_chunks (id);
CREATE INDEX IF NOT EXISTS ix_document_chunks_document_id ON document_chunks (document_id);

-- Create app_documents table
CREATE TABLE IF NOT EXISTS app_documents (
    id SERIAL PRIMARY KEY,
    app_id INTEGER NOT NULL REFERENCES deployed_apps(id),
    document_id INTEGER NOT NULL REFERENCES documents(id),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create indexes on app_documents
CREATE INDEX IF NOT EXISTS ix_app_documents_id ON app_documents (id);
CREATE INDEX IF NOT EXISTS ix_app_documents_app_id ON app_documents (app_id);
CREATE INDEX IF NOT EXISTS ix_app_documents_document_id ON app_documents (document_id);
