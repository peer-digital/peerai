-- Revert database to use app_id instead of slug

-- Step 1: Create a temporary table to store the current data
CREATE TEMPORARY TABLE temp_deployed_apps AS
SELECT * FROM deployed_apps;

-- Step 2: Drop the foreign key constraint in app_documents
ALTER TABLE app_documents DROP CONSTRAINT fk_app_documents_app_slug;

-- Step 3: Drop the primary key constraint on deployed_apps
ALTER TABLE deployed_apps DROP CONSTRAINT deployed_apps_new_pkey;

-- Step 4: Add id column to deployed_apps
ALTER TABLE deployed_apps ADD COLUMN id SERIAL PRIMARY KEY;

-- Step 5: Rename app_slug to app_id in app_documents
ALTER TABLE app_documents RENAME COLUMN app_slug TO app_id;

-- Step 6: Update the foreign key in app_documents to reference deployed_apps.id
ALTER TABLE app_documents ADD CONSTRAINT fk_app_documents_app_id 
FOREIGN KEY (app_id) REFERENCES deployed_apps(id);

-- Step 7: Create index on deployed_apps.id
CREATE INDEX IF NOT EXISTS idx_deployed_apps_id ON deployed_apps(id);

-- Step 8: Keep the slug column but make it non-primary (it should still be unique)
ALTER TABLE deployed_apps ADD CONSTRAINT unique_deployed_apps_slug UNIQUE (slug);
