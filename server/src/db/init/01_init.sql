-- Runs automatically the first time the MySQL container initialises an empty
-- data directory (mounted at /docker-entrypoint-initdb.d). Safe to re-run
-- conceptually because of IF NOT EXISTS, though it only executes on a fresh
-- volume — use `npm run db:reset` to force re-initialisation.
--
-- Phase 0: just guarantees the database exists with the right charset so the
-- health check's SELECT 1 succeeds. Real tables (regions, occupancy, spend,
-- length_of_stay, users) arrive with DIH-2 and DIH-1 as separate migration
-- files in this same directory.

CREATE DATABASE IF NOT EXISTS dih_dev
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE dih_dev;

-- Phase 0 sentinel table. Lets the seed step and health diagnostics confirm
-- the init script ran without depending on feature tables that do not exist
-- yet. This will be dropped once DIH-2 introduces the real schema.
CREATE TABLE IF NOT EXISTS _bootstrap (
  id           TINYINT UNSIGNED NOT NULL PRIMARY KEY,
  initialised_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO _bootstrap (id)
VALUES (1)
ON DUPLICATE KEY UPDATE initialised_at = CURRENT_TIMESTAMP;
