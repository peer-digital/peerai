-- Fix app_documents table to use app_id as integer with proper foreign key

-- Step 1: Create a temporary table to store the current data
CREATE TEMPORARY TABLE temp_app_documents AS
SELECT id, document_id, is_active, created_at, app_id AS old_app_id FROM app_documents;

-- Step 2: Create a mapping table to map slug to id
CREATE TEMPORARY TABLE slug_to_id_mapping AS
SELECT slug, id FROM deployed_apps;

-- Step 3: Drop the app_id column
ALTER TABLE app_documents DROP COLUMN app_id;

-- Step 4: Add a new app_id column with integer type
ALTER TABLE app_documents ADD COLUMN app_id INTEGER;

-- Step 5: Update the app_id values based on the slug mapping
UPDATE app_documents ad
SET app_id = m.id
FROM temp_app_documents t, slug_to_id_mapping m
WHERE ad.id = t.id AND t.old_app_id = m.slug;

-- Step 6: Make app_id NOT NULL
ALTER TABLE app_documents ALTER COLUMN app_id SET NOT NULL;

-- Step 7: Add the foreign key constraint
ALTER TABLE app_documents ADD CONSTRAINT fk_app_documents_app_id 
FOREIGN KEY (app_id) REFERENCES deployed_apps(id);

-- Step 8: Create index on app_id
CREATE INDEX idx_app_documents_app_id ON app_documents(app_id);

-- Step 9: Drop the old index if it exists
DROP INDEX IF EXISTS idx_app_documents_app_slug;
