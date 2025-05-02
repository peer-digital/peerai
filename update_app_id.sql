-- Update the app_id to match the slug number
-- First, create a function to extract the numeric part of the slug
CREATE OR REPLACE FUNCTION extract_number_from_slug(slug TEXT) RETURNS INTEGER AS $$
DECLARE
    number_part TEXT;
BEGIN
    -- Extract the number part after the last dash
    number_part := substring(slug from '([0-9]+)$');
    
    -- Return the number, or NULL if no number found
    IF number_part IS NULL OR number_part = '' THEN
        RETURN NULL;
    ELSE
        RETURN number_part::INTEGER;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Create a temporary table to store the mapping
CREATE TEMPORARY TABLE app_id_mapping AS
SELECT id AS old_id, slug, extract_number_from_slug(slug) AS new_id
FROM deployed_apps
WHERE extract_number_from_slug(slug) IS NOT NULL;

-- Update app_documents to use the new app_id
UPDATE app_documents ad
SET app_id = m.new_id
FROM app_id_mapping m
WHERE ad.app_id = m.old_id;

-- Update the deployed_apps table to use the new ID
UPDATE deployed_apps da
SET id = m.new_id
FROM app_id_mapping m
WHERE da.id = m.old_id AND m.new_id IS NOT NULL;

-- Reset the sequence for deployed_apps_id_seq
SELECT setval('deployed_apps_id_seq', (SELECT MAX(id) FROM deployed_apps), true);

-- Drop the function
DROP FUNCTION extract_number_from_slug(TEXT);
