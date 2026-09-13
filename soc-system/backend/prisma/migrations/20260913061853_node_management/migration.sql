/*
  Warnings:

  - Added the required column `auth_method` to the `nodes` table without a default value. This is not possible if the table is not empty.
  - Added the required column `host` to the `nodes` table without a default value. This is not possible if the table is not empty.
  - Added the required column `port` to the `nodes` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `nodes` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `nodes` ADD COLUMN `api_base_url` VARCHAR(500) NULL,
    ADD COLUMN `api_version` VARCHAR(32) NULL,
    ADD COLUMN `auth_method` ENUM('API_TOKEN', 'USERNAME_PASSWORD', 'SERVICE_ACCOUNT', 'LDAP_BIND') NOT NULL,
    ADD COLUMN `connection_timeout_ms` INTEGER NOT NULL DEFAULT 5000,
    ADD COLUMN `created_by` VARCHAR(191) NULL,
    ADD COLUMN `current_health` ENUM('UNKNOWN', 'HEALTHY', 'DEGRADED', 'UNHEALTHY', 'DISABLED', 'MAINTENANCE') NOT NULL DEFAULT 'UNKNOWN',
    ADD COLUMN `current_latency_ms` INTEGER NULL,
    ADD COLUMN `custom_ca_certificate` TEXT NULL,
    ADD COLUMN `description` VARCHAR(500) NULL,
    ADD COLUMN `enabled` BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN `environment` ENUM('PRODUCTION', 'UAT', 'DR') NOT NULL DEFAULT 'PRODUCTION',
    ADD COLUMN `host` VARCHAR(255) NOT NULL,
    ADD COLUMN `last_collection_at` DATETIME(3) NULL,
    ADD COLUMN `last_error` VARCHAR(1000) NULL,
    ADD COLUMN `last_successful_connection_at` DATETIME(3) NULL,
    ADD COLUMN `polling_interval_seconds` INTEGER NOT NULL DEFAULT 300,
    ADD COLUMN `port` INTEGER NOT NULL,
    ADD COLUMN `retry_backoff_ms` INTEGER NOT NULL DEFAULT 2000,
    ADD COLUMN `retry_max_attempts` INTEGER NOT NULL DEFAULT 3,
    ADD COLUMN `syslog_port` INTEGER NULL,
    ADD COLUMN `tls_verify` BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN `updated_at` DATETIME(3) NOT NULL,
    ADD COLUMN `updated_by` VARCHAR(191) NULL,
    ADD COLUMN `vdom` VARCHAR(64) NULL;

-- CreateTable
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

-- CreateTable
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

-- CreateTable
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

-- CreateTable
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

-- CreateIndex
CREATE INDEX `nodes_type_idx` ON `nodes`(`type`);

-- CreateIndex
CREATE INDEX `nodes_environment_idx` ON `nodes`(`environment`);

-- AddForeignKey
ALTER TABLE `nodes` ADD CONSTRAINT `nodes_created_by_fkey` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `nodes` ADD CONSTRAINT `nodes_updated_by_fkey` FOREIGN KEY (`updated_by`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `node_credentials` ADD CONSTRAINT `node_credentials_node_id_fkey` FOREIGN KEY (`node_id`) REFERENCES `nodes`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `node_credentials` ADD CONSTRAINT `node_credentials_rotated_by_fkey` FOREIGN KEY (`rotated_by`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `node_health_checks` ADD CONSTRAINT `node_health_checks_node_id_fkey` FOREIGN KEY (`node_id`) REFERENCES `nodes`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `collectors` ADD CONSTRAINT `collectors_node_id_fkey` FOREIGN KEY (`node_id`) REFERENCES `nodes`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `collector_runs` ADD CONSTRAINT `collector_runs_collector_id_fkey` FOREIGN KEY (`collector_id`) REFERENCES `collectors`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
