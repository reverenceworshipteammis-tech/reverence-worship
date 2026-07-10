-- Reset Neon public schema before importing database_neon.sql.
-- WARNING: This deletes all tables/data in the current Neon database.
-- Use this only for a test deployment database, then run database_neon.sql again.

DROP SCHEMA IF EXISTS public CASCADE;
CREATE SCHEMA public;
GRANT ALL ON SCHEMA public TO public;
