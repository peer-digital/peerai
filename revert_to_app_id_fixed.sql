-- Revert database to use app_id instead of slug

-- Step 1: Create a temporary table to store the current data
CREATE TEMPORARY TABLE temp_deployed_apps AS
SELECT * FROM deployed_apps;

-- Step 2: Drop the foreign key constraint in app_documents
ALTER TABLE app_documents DROP CONSTRAINT IF EXISTS fk_app_documents_app_slug;

-- Step 3: Drop the primary key constraint on deployed_apps
ALTER TABLE deployed_apps DROP CONSTRAINT IF EXISTS deployed_apps_new_pkey;

-- Step 4: Add id column to deployed_apps
ALTER TABLE deployed_apps ADD COLUMN id SERIAL PRIMARY KEY;

-- Step 5: Create a mapping table to store the relationship between slug and id
CREATE TEMPORARY TABLE slug_to_id_mapping AS
SELECT slug, id FROM deployed_apps;

-- Step 6: Create a new app_id column in app_documents with the correct type
ALTER TABLE app_documents ADD COLUMN app_id INTEGER;

-- Step 7: Update the app_id values based on the slug mapping
UPDATE app_documents ad
SET app_id = m.id
FROM slug_to_id_mapping m
WHERE ad.app_slug = m.slug;

-- Step 8: Drop the app_slug column
ALTER TABLE app_documents DROP COLUMN app_slug;

-- Step 9: Make app_id NOT NULL
ALTER TABLE app_documents ALTER COLUMN app_id SET NOT NULL;

-- Step 10: Add the foreign key constraint
ALTER TABLE app_documents ADD CONSTRAINT fk_app_documents_app_id 
FOREIGN KEY (app_id) REFERENCES deployed_apps(id);

-- Step 11: Create index on deployed_apps.id
CREATE INDEX IF NOT EXISTS idx_deployed_apps_id ON deployed_apps(id);

-- Step 12: Keep the slug column but make it non-primary (it should still be unique)
ALTER TABLE deployed_apps ADD CONSTRAINT unique_deployed_apps_slug UNIQUE (slug);
