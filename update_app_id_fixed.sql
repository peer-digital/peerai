-- Update the app_id to match the slug number
-- First, let's check the current app_id and slug
SELECT id, slug FROM deployed_apps WHERE slug = 'rag-chatbot-946';

-- Let's check the app_documents table
SELECT * FROM app_documents WHERE app_id = 4;

-- Let's update the app_id in the app_documents table to use the correct app_id
UPDATE app_documents SET app_id = 946 WHERE app_id = 4;

-- Now let's update the deployed_apps table to use the new ID
UPDATE deployed_apps SET id = 946 WHERE id = 4;

-- Reset the sequence for deployed_apps_id_seq
SELECT setval('deployed_apps_id_seq', (SELECT MAX(id) FROM deployed_apps), true);
