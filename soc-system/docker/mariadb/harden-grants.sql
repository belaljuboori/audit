-- Run ONCE, after 'prisma migrate deploy' has created the schema, using the
-- MariaDB root account (only the deploy pipeline ever uses root — the
-- running backend container never does).
--
-- 01-create-app-user.sh grants soc_app a single coarse, database-wide
-- SELECT/INSERT/UPDATE/DELETE grant so the app is functional immediately
-- after first boot (the tables don't exist yet at that point, so MariaDB
-- cannot accept table-level GRANTs then). This script replaces that coarse
-- grant with per-table grants now that the tables exist, and deliberately
-- omits UPDATE/DELETE on audit_logs so the audit trail is insert-only at the
-- database layer, not just by application code convention.
REVOKE SELECT, INSERT, UPDATE, DELETE ON `soc_live_monitoring`.* FROM 'soc_app'@'%';

GRANT SELECT, INSERT, UPDATE, DELETE ON `soc_live_monitoring`.`users` TO 'soc_app'@'%';
GRANT SELECT, INSERT, UPDATE, DELETE ON `soc_live_monitoring`.`roles` TO 'soc_app'@'%';
GRANT SELECT, INSERT, UPDATE, DELETE ON `soc_live_monitoring`.`permissions` TO 'soc_app'@'%';
GRANT SELECT, INSERT, UPDATE, DELETE ON `soc_live_monitoring`.`user_roles` TO 'soc_app'@'%';
GRANT SELECT, INSERT, UPDATE, DELETE ON `soc_live_monitoring`.`role_permissions` TO 'soc_app'@'%';
GRANT SELECT, INSERT, UPDATE, DELETE ON `soc_live_monitoring`.`refresh_tokens` TO 'soc_app'@'%';
GRANT SELECT, INSERT, UPDATE, DELETE ON `soc_live_monitoring`.`system_settings` TO 'soc_app'@'%';
GRANT SELECT, INSERT, UPDATE, DELETE ON `soc_live_monitoring`.`nodes` TO 'soc_app'@'%';
GRANT SELECT, INSERT ON `soc_live_monitoring`.`audit_logs` TO 'soc_app'@'%';

FLUSH PRIVILEGES;
