-- SQL script to update the role enum and user roles
-- This script should be run directly against the database

-- 1. Temporarily change the column type to string
ALTER TABLE users ALTER COLUMN role TYPE VARCHAR;

-- 2. Drop the old enum type
DROP TYPE role;

-- 3. Create the new enum type with APP_MANAGER instead of CONTENT_MANAGER
CREATE TYPE role AS ENUM ('GUEST', 'USER', 'USER_ADMIN', 'SUPER_ADMIN', 'APP_MANAGER');

-- 4. Update any CONTENT_MANAGER roles to APP_MANAGER
UPDATE users SET role = 'APP_MANAGER' WHERE role = 'CONTENT_MANAGER';

-- 5. Convert the column back to enum type
ALTER TABLE users ALTER COLUMN role TYPE role USING role::role;

-- 6. Verify the update
SELECT role, COUNT(*) FROM users GROUP BY role;
