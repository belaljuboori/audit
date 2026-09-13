-- SOC Live Monitoring System — Phase 1 database schema
-- Import via phpMyAdmin (Import tab) against an empty/new database, or via:
--   mysql -u root -p soc_live_monitoring < db-schema.sql
--
-- This file is generated from the Prisma migration
-- backend/prisma/migrations/20260910073228_init/migration.sql and is kept in
-- sync with it by hand whenever that migration changes. The application
-- itself never runs this file directly — it runs Prisma migrations. This
-- copy exists solely so a DBA can inspect/import the schema through
-- phpMyAdmin without installing Node.js tooling.
--
-- IMPORTANT: this file creates TABLES only. It does not create the
-- `soc_app` / `soc_migrator` MariaDB accounts or their grants — that is
-- deliberately kept in docker/mariadb/init/01-create-app-user.sh and
-- docker/mariadb/harden-grants.sql so credentials are never hardcoded in a
-- file meant to be imported ad hoc.

SET NAMES utf8mb4;
SET time_zone = '+00:00';

CREATE DATABASE IF NOT EXISTS `soc_live_monitoring`
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE `soc_live_monitoring`;

-- ── users ────────────────────────────────────────────────────────────────
CREATE TABLE `users` (
    `id` VARCHAR(191) NOT NULL,
    `username` VARCHAR(64) NOT NULL,
    `email` VARCHAR(255) NOT NULL,
    `password_hash` VARCHAR(255) NOT NULL,
    `full_name` VARCHAR(255) NOT NULL,
    `status` ENUM('ACTIVE', 'DISABLED', 'LOCKED') NOT NULL DEFAULT 'ACTIVE',
    `failed_login_count` INTEGER NOT NULL DEFAULT 0,
    `locked_until` DATETIME(3) NULL,
    `last_login_at` DATETIME(3) NULL,
    `last_login_ip` VARCHAR(45) NULL,
    `password_changed_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `must_change_password` BOOLEAN NOT NULL DEFAULT false,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `users_username_key`(`username`),
    UNIQUE INDEX `users_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- ── roles ────────────────────────────────────────────────────────────────
CREATE TABLE `roles` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(64) NOT NULL,
    `description` VARCHAR(255) NULL,
    `is_system` BOOLEAN NOT NULL DEFAULT false,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `roles_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- ── permissions ──────────────────────────────────────────────────────────
CREATE TABLE `permissions` (
    `id` VARCHAR(191) NOT NULL,
    `key` VARCHAR(128) NOT NULL,
    `description` VARCHAR(255) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `permissions_key_key`(`key`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- ── user_roles ───────────────────────────────────────────────────────────
CREATE TABLE `user_roles` (
    `user_id` VARCHAR(191) NOT NULL,
    `role_id` VARCHAR(191) NOT NULL,
    `assigned_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `assigned_by` VARCHAR(191) NULL,

    INDEX `user_roles_role_id_idx`(`role_id`),
    PRIMARY KEY (`user_id`, `role_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- ── role_permissions ─────────────────────────────────────────────────────
CREATE TABLE `role_permissions` (
    `role_id` VARCHAR(191) NOT NULL,
    `permission_id` VARCHAR(191) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `role_permissions_permission_id_idx`(`permission_id`),
    PRIMARY KEY (`role_id`, `permission_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- ── refresh_tokens ───────────────────────────────────────────────────────
CREATE TABLE `refresh_tokens` (
    `id` VARCHAR(191) NOT NULL,
    `user_id` VARCHAR(191) NOT NULL,
    `token_hash` VARCHAR(128) NOT NULL,
    `family_id` VARCHAR(191) NOT NULL,
    `issued_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `expires_at` DATETIME(3) NOT NULL,
    `revoked_at` DATETIME(3) NULL,
    `replaced_by_id` VARCHAR(191) NULL,
    `ip_address` VARCHAR(45) NULL,
    `user_agent` VARCHAR(512) NULL,

    UNIQUE INDEX `refresh_tokens_token_hash_key`(`token_hash`),
    INDEX `refresh_tokens_user_id_idx`(`user_id`),
    INDEX `refresh_tokens_family_id_idx`(`family_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- ── audit_logs (insert-only at the MariaDB grant level — see harden-grants.sql) ──
CREATE TABLE `audit_logs` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `actor_user_id` VARCHAR(191) NULL,
    `actor_username_snapshot` VARCHAR(64) NULL,
    `action` VARCHAR(128) NOT NULL,
    `target_type` VARCHAR(64) NULL,
    `target_id` VARCHAR(128) NULL,
    `result` ENUM('SUCCESS', 'FAILURE', 'DENIED') NOT NULL,
    `ip_address` VARCHAR(45) NULL,
    `user_agent` VARCHAR(512) NULL,
    `metadata` JSON NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `audit_logs_actor_user_id_idx`(`actor_user_id`),
    INDEX `audit_logs_action_idx`(`action`),
    INDEX `audit_logs_created_at_idx`(`created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- ── system_settings ──────────────────────────────────────────────────────
CREATE TABLE `system_settings` (
    `key` VARCHAR(128) NOT NULL,
    `value` JSON NOT NULL,
    `description` VARCHAR(255) NULL,
    `updated_by` VARCHAR(191) NULL,
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`key`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- ── nodes (Phase 2 — full configuration; secrets live in node_credentials, never here) ──
CREATE TABLE `nodes` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(128) NOT NULL,
    `type` ENUM('FORTIGATE', 'FORTIWEB', 'ACTIVE_DIRECTORY', 'GPO_COLLECTOR') NOT NULL,
    `description` VARCHAR(500) NULL,
    `environment` ENUM('PRODUCTION', 'UAT', 'DR') NOT NULL DEFAULT 'PRODUCTION',
    `enabled` BOOLEAN NOT NULL DEFAULT true,
    `host` VARCHAR(255) NOT NULL,
    `port` INTEGER NOT NULL,
    `api_base_url` VARCHAR(500) NULL,
    `api_version` VARCHAR(32) NULL,
    `vdom` VARCHAR(64) NULL,
    `tls_verify` BOOLEAN NOT NULL DEFAULT true,
    `custom_ca_certificate` TEXT NULL,
    `auth_method` ENUM('API_TOKEN', 'USERNAME_PASSWORD', 'SERVICE_ACCOUNT', 'LDAP_BIND') NOT NULL,
    `polling_interval_seconds` INTEGER NOT NULL DEFAULT 300,
    `syslog_port` INTEGER NULL,
    `connection_timeout_ms` INTEGER NOT NULL DEFAULT 5000,
    `retry_max_attempts` INTEGER NOT NULL DEFAULT 3,
    `retry_backoff_ms` INTEGER NOT NULL DEFAULT 2000,
    `last_successful_connection_at` DATETIME(3) NULL,
    `last_collection_at` DATETIME(3) NULL,
    `current_health` ENUM('UNKNOWN', 'HEALTHY', 'DEGRADED', 'UNHEALTHY', 'DISABLED', 'MAINTENANCE') NOT NULL DEFAULT 'UNKNOWN',
    `current_latency_ms` INTEGER NULL,
    `last_error` VARCHAR(1000) NULL,
    `created_by` VARCHAR(191) NULL,
    `updated_by` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `nodes_type_idx`(`type`),
    INDEX `nodes_environment_idx`(`environment`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- ── node_credentials (separate table — see docs/phase1-architecture.md §3 for why) ──
CREATE TABLE `node_credentials` (
    `id` VARCHAR(191) NOT NULL,
    `node_id` VARCHAR(191) NOT NULL,
    `credential_type` ENUM('API_TOKEN', 'PASSWORD', 'SERVICE_ACCOUNT_JSON', 'LDAP_BIND_PASSWORD') NOT NULL,
    `encrypted_secret` TEXT NOT NULL,
    `rotated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `rotated_by` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `node_credentials_node_id_key`(`node_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- ── node_health_checks ───────────────────────────────────────────────────
CREATE TABLE `node_health_checks` (
    `id` VARCHAR(191) NOT NULL,
    `node_id` VARCHAR(191) NOT NULL,
    `checked_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `status` ENUM('UNKNOWN', 'HEALTHY', 'DEGRADED', 'UNHEALTHY', 'DISABLED', 'MAINTENANCE') NOT NULL,
    `latency_ms` INTEGER NULL,
    `error_message` VARCHAR(1000) NULL,
    `source` ENUM('MANUAL_TEST', 'SCHEDULED') NOT NULL,
    `steps_json` JSON NULL,

    INDEX `node_health_checks_node_id_checked_at_idx`(`node_id`, `checked_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- ── collectors (one per node — see docs/phase2-architecture.md) ─────────────
CREATE TABLE `collectors` (
    `id` VARCHAR(191) NOT NULL,
    `node_id` VARCHAR(191) NOT NULL,
    `status` ENUM('STOPPED', 'RUNNING', 'PAUSED', 'ERROR') NOT NULL DEFAULT 'STOPPED',
    `last_started_at` DATETIME(3) NULL,
    `last_stopped_at` DATETIME(3) NULL,
    `last_heartbeat_at` DATETIME(3) NULL,
    `last_error` VARCHAR(1000) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `collectors_node_id_key`(`node_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- ── collector_runs ───────────────────────────────────────────────────────
CREATE TABLE `collector_runs` (
    `id` VARCHAR(191) NOT NULL,
    `collector_id` VARCHAR(191) NOT NULL,
    `started_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `finished_at` DATETIME(3) NULL,
    `result` ENUM('SUCCESS', 'FAILURE') NULL,
    `events_collected` INTEGER NOT NULL DEFAULT 0,
    `error_message` VARCHAR(1000) NULL,

    INDEX `collector_runs_collector_id_started_at_idx`(`collector_id`, `started_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- ── Foreign keys ─────────────────────────────────────────────────────────
ALTER TABLE `user_roles` ADD CONSTRAINT `user_roles_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `user_roles` ADD CONSTRAINT `user_roles_role_id_fkey` FOREIGN KEY (`role_id`) REFERENCES `roles`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `role_permissions` ADD CONSTRAINT `role_permissions_role_id_fkey` FOREIGN KEY (`role_id`) REFERENCES `roles`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `role_permissions` ADD CONSTRAINT `role_permissions_permission_id_fkey` FOREIGN KEY (`permission_id`) REFERENCES `permissions`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `refresh_tokens` ADD CONSTRAINT `refresh_tokens_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `system_settings` ADD CONSTRAINT `system_settings_updated_by_fkey` FOREIGN KEY (`updated_by`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `nodes` ADD CONSTRAINT `nodes_created_by_fkey` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `nodes` ADD CONSTRAINT `nodes_updated_by_fkey` FOREIGN KEY (`updated_by`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `node_credentials` ADD CONSTRAINT `node_credentials_node_id_fkey` FOREIGN KEY (`node_id`) REFERENCES `nodes`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `node_credentials` ADD CONSTRAINT `node_credentials_rotated_by_fkey` FOREIGN KEY (`rotated_by`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `node_health_checks` ADD CONSTRAINT `node_health_checks_node_id_fkey` FOREIGN KEY (`node_id`) REFERENCES `nodes`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `collectors` ADD CONSTRAINT `collectors_node_id_fkey` FOREIGN KEY (`node_id`) REFERENCES `nodes`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `collector_runs` ADD CONSTRAINT `collector_runs_collector_id_fkey` FOREIGN KEY (`collector_id`) REFERENCES `collectors`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- ── Prisma migration bookkeeping table ──────────────────────────────────
-- Only needed if you intend for the Node.js application (via Prisma) to
-- keep managing schema changes going forward after a phpMyAdmin-based
-- import. Safe to omit if this import is for inspection/reporting only.
CREATE TABLE `_prisma_migrations` (
    `id` VARCHAR(36) NOT NULL,
    `checksum` VARCHAR(64) NOT NULL,
    `finished_at` DATETIME(3) NULL,
    `migration_name` VARCHAR(255) NOT NULL,
    `logs` TEXT NULL,
    `rolled_back_at` DATETIME(3) NULL,
    `started_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `applied_steps_count` INTEGER UNSIGNED NOT NULL DEFAULT 0,
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- ── Seed data: permission catalog ───────────────────────────────────────
-- IDs use MariaDB's UUID() so this file can be imported standalone; the
-- application (via Prisma) uses UUIDs generated in Node.js for the same
-- rows when seeding through `npm run prisma:seed` instead.
INSERT INTO `permissions` (`id`, `key`, `description`, `created_at`) VALUES
  (UUID(), 'nodes.read', 'View configured monitoring nodes', NOW(3)),
  (UUID(), 'nodes.create', 'Add new monitoring nodes', NOW(3)),
  (UUID(), 'nodes.update', 'Edit existing monitoring nodes', NOW(3)),
  (UUID(), 'nodes.delete', 'Delete monitoring nodes', NOW(3)),
  (UUID(), 'nodes.test', 'Run the node connection test workflow', NOW(3)),
  (UUID(), 'collectors.start', 'Start a data collector', NOW(3)),
  (UUID(), 'collectors.stop', 'Stop a data collector', NOW(3)),
  (UUID(), 'collectors.restart', 'Restart a data collector', NOW(3)),
  (UUID(), 'reports.generate', 'Generate reports', NOW(3)),
  (UUID(), 'reports.download', 'Download generated reports', NOW(3)),
  (UUID(), 'compliance.manage', 'Manage compliance rules and findings', NOW(3)),
  (UUID(), 'users.manage', 'Create, edit, disable and assign roles to users', NOW(3)),
  (UUID(), 'roles.manage', 'Manage roles and their permission bundles', NOW(3)),
  (UUID(), 'audit.read', 'View the administrative audit log', NOW(3)),
  (UUID(), 'system.settings.manage', 'View and change system-wide settings', NOW(3));

-- ── Seed data: default roles ─────────────────────────────────────────────
INSERT INTO `roles` (`id`, `name`, `description`, `is_system`, `created_at`, `updated_at`) VALUES
  (UUID(), 'Super Admin', 'Full system access, including user, node and system administration.', true, NOW(3), NOW(3)),
  (UUID(), 'SOC Admin', 'Operates monitoring, collectors, alerts and reports. Cannot manage users or secrets.', true, NOW(3), NOW(3)),
  (UUID(), 'SOC Analyst', 'Views dashboards and events, manages incidents and generates in-scope reports.', true, NOW(3), NOW(3)),
  (UUID(), 'Compliance Auditor', 'Read-only access to compliance results, evidence and reports.', true, NOW(3), NOW(3)),
  (UUID(), 'Viewer', 'Read-only access to permitted dashboards.', true, NOW(3), NOW(3));

-- ── Seed data: role -> permission bundles ────────────────────────────────
-- Super Admin gets every permission.
INSERT INTO `role_permissions` (`role_id`, `permission_id`, `created_at`)
SELECT r.id, p.id, NOW(3) FROM `roles` r CROSS JOIN `permissions` p
WHERE r.name = 'Super Admin';

INSERT INTO `role_permissions` (`role_id`, `permission_id`, `created_at`)
SELECT r.id, p.id, NOW(3) FROM `roles` r CROSS JOIN `permissions` p
WHERE r.name = 'SOC Admin'
  AND p.key IN ('nodes.read','nodes.test','collectors.start','collectors.stop','collectors.restart','reports.generate','reports.download','compliance.manage','audit.read');

INSERT INTO `role_permissions` (`role_id`, `permission_id`, `created_at`)
SELECT r.id, p.id, NOW(3) FROM `roles` r CROSS JOIN `permissions` p
WHERE r.name = 'SOC Analyst'
  AND p.key IN ('nodes.read','reports.generate','reports.download');

INSERT INTO `role_permissions` (`role_id`, `permission_id`, `created_at`)
SELECT r.id, p.id, NOW(3) FROM `roles` r CROSS JOIN `permissions` p
WHERE r.name = 'Compliance Auditor'
  AND p.key IN ('reports.download');

-- Viewer intentionally gets no elevated permissions (dashboard visibility is
-- governed by future Phase dashboard-scoping rules, not by this catalog).

-- ── Seed data: default system settings ───────────────────────────────────
INSERT INTO `system_settings` (`key`, `value`, `description`, `updated_at`) VALUES
  ('auth.login_max_attempts', '5', 'Failed login attempts before an account is temporarily locked.', NOW(3)),
  ('auth.login_lockout_minutes', '15', 'Lockout duration in minutes after exceeding max failed login attempts.', NOW(3));

-- NOTE: No bootstrap Super Admin user is created by this file. Passwords
-- must be Argon2id-hashed by the application — never insert a plaintext or
-- weakly-hashed password via phpMyAdmin. Create the first Super Admin by
-- running `npm run prisma:seed` (optionally with SEED_SUPER_ADMIN_PASSWORD
-- set) from the backend, or via the (future) admin bootstrap CLI.
