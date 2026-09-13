-- Run ONCE on a fresh environment, after 'prisma migrate deploy' has created
-- the full schema (all migrations up to this point), using the MariaDB root
-- account (only the deploy pipeline ever uses root — the running backend
-- container never does).
--
-- 01-create-app-user.sh grants soc_app a single coarse, database-wide
-- SELECT/INSERT/UPDATE/DELETE grant so the app is functional immediately
-- after first boot (the tables don't exist yet at that point, so MariaDB
-- cannot accept table-level GRANTs then). This script replaces that coarse
-- grant with per-table grants now that the tables exist, and deliberately
-- omits UPDATE/DELETE on audit_logs so the audit trail is insert-only at the
-- database layer, not just by application code convention.
--
-- IMPORTANT — this file is NOT safe to re-run after the first time: the
-- REVOKE below fails once the coarse grant it targets no longer exists. If a
-- database was already hardened against an earlier phase's schema (e.g. it
-- ran this file back when only Phase 1's tables existed) and a later phase
-- then adds tables via a new migration, do NOT re-run this file — instead
-- add a new, small, idempotent `grants-phaseN.sql` containing only `GRANT
-- ... ON <new table> TO 'soc_app'@'%';` lines for that phase's new tables,
-- and run only that. This project has not yet had a real production
-- deployment, so as of Phase 2 this file simply reflects the complete
-- schema-to-date; the incremental-file convention starts with whichever
-- phase ships after whatever has actually been deployed for real.
REVOKE SELECT, INSERT, UPDATE, DELETE ON `soc_live_monitoring`.* FROM 'soc_app'@'%';

GRANT SELECT, INSERT, UPDATE, DELETE ON `soc_live_monitoring`.`users` TO 'soc_app'@'%';
GRANT SELECT, INSERT, UPDATE, DELETE ON `soc_live_monitoring`.`roles` TO 'soc_app'@'%';
GRANT SELECT, INSERT, UPDATE, DELETE ON `soc_live_monitoring`.`permissions` TO 'soc_app'@'%';
GRANT SELECT, INSERT, UPDATE, DELETE ON `soc_live_monitoring`.`user_roles` TO 'soc_app'@'%';
GRANT SELECT, INSERT, UPDATE, DELETE ON `soc_live_monitoring`.`role_permissions` TO 'soc_app'@'%';
GRANT SELECT, INSERT, UPDATE, DELETE ON `soc_live_monitoring`.`refresh_tokens` TO 'soc_app'@'%';
GRANT SELECT, INSERT, UPDATE, DELETE ON `soc_live_monitoring`.`system_settings` TO 'soc_app'@'%';
GRANT SELECT, INSERT, UPDATE, DELETE ON `soc_live_monitoring`.`nodes` TO 'soc_app'@'%';
GRANT SELECT, INSERT, UPDATE, DELETE ON `soc_live_monitoring`.`node_credentials` TO 'soc_app'@'%';
GRANT SELECT, INSERT, UPDATE, DELETE ON `soc_live_monitoring`.`node_health_checks` TO 'soc_app'@'%';
GRANT SELECT, INSERT, UPDATE, DELETE ON `soc_live_monitoring`.`collectors` TO 'soc_app'@'%';
GRANT SELECT, INSERT, UPDATE, DELETE ON `soc_live_monitoring`.`collector_runs` TO 'soc_app'@'%';
GRANT SELECT, INSERT ON `soc_live_monitoring`.`audit_logs` TO 'soc_app'@'%';

FLUSH PRIVILEGES;
