-- Emergency database fix script for constraint and migration issues
-- To run: psql -U peerai -h localhost -d peerai_db -f emergency_db_fix.sql

-- Start a transaction
BEGIN;

-- Check if the constraint exists and drop it if it does
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'uq_referrals_referee_id'
    ) THEN
        EXECUTE 'ALTER TABLE referrals DROP CONSTRAINT uq_referrals_referee_id';
        RAISE NOTICE 'Dropped constraint uq_referrals_referee_id';
    ELSE
        RAISE NOTICE 'Constraint uq_referrals_referee_id does not exist';
    END IF;
END $$;

-- Check if users table exists but doesn't have the email verification fields
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables WHERE table_name = 'users'
    ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'email_verified'
    ) THEN
        -- Add the email verification fields
        ALTER TABLE users ADD COLUMN email_verified BOOLEAN NOT NULL DEFAULT false;
        ALTER TABLE users ADD COLUMN verification_token VARCHAR(255);
        ALTER TABLE users ADD COLUMN verification_token_expires_at TIMESTAMP;
        RAISE NOTICE 'Added email verification fields to users table';
    ELSE
        RAISE NOTICE 'Email verification fields already exist or users table does not exist';
    END IF;
END $$;

-- Make sure alembic_version table exists and contains the right version
DO $$
BEGIN
    -- Create alembic_version table if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables WHERE table_name = 'alembic_version'
    ) THEN
        CREATE TABLE alembic_version (
            version_num VARCHAR(32) NOT NULL,
            PRIMARY KEY (version_num)
        );
        INSERT INTO alembic_version (version_num) VALUES ('16e5e60f9836');
        RAISE NOTICE 'Created alembic_version table with version 16e5e60f9836';
    ELSE
        -- Update existing alembic_version
        DELETE FROM alembic_version;
        INSERT INTO alembic_version (version_num) VALUES ('16e5e60f9836');
        RAISE NOTICE 'Updated alembic_version to 16e5e60f9836';
    END IF;
END $$;

-- Commit all changes
COMMIT;

-- Print final status
DO $$
BEGIN
    RAISE NOTICE 'Emergency database fix completed successfully';
    RAISE NOTICE 'Migration version set to 16e5e60f9836';
    RAISE NOTICE 'Constraint uq_referrals_referee_id has been removed if it existed';
END $$; 