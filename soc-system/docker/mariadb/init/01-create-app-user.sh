#!/bin/bash
# Runs once, on first container initialization only (official MariaDB image
# behavior for /docker-entrypoint-initdb.d). Creates two application-facing
# MariaDB accounts. The running application NEVER uses the root account.
#
# soc_app starts with a single coarse, database-wide grant because the
# schema's tables don't exist yet at this point (Prisma migrate hasn't run,
# and MariaDB rejects table-level GRANTs on tables that don't exist). Once
# migrations have created the tables, run
# docker/mariadb/harden-grants.sql (as root) to replace this coarse grant
# with per-table grants — most importantly, INSERT+SELECT only (no
# UPDATE/DELETE) on audit_logs, so the audit trail is insert-only at the
# database layer. See docs/installation-guide.md for the exact deploy order.
#
# Required environment variables (set via docker-compose.yml / .env):
#   SOC_APP_DB_PASSWORD       — least-privilege runtime account (soc_app)
#   SOC_MIGRATOR_DB_PASSWORD  — migration-only account (soc_migrator), used
#                                exclusively by the deploy pipeline, never by
#                                the running application container.
set -euo pipefail

: "${MYSQL_DATABASE:?MYSQL_DATABASE must be set}"
: "${SOC_APP_DB_PASSWORD:?SOC_APP_DB_PASSWORD must be set}"
: "${SOC_MIGRATOR_DB_PASSWORD:?SOC_MIGRATOR_DB_PASSWORD must be set}"

mysql -uroot -p"${MYSQL_ROOT_PASSWORD}" <<-EOSQL
  -- Migrator account: DDL rights on the app schema plus the ability to
  -- create/drop the temporary shadow database Prisma Migrate uses to diff
  -- schema changes. Used only by 'prisma migrate deploy' in the deploy
  -- pipeline, never referenced by the application's own DATABASE_URL.
  CREATE USER IF NOT EXISTS 'soc_migrator'@'%' IDENTIFIED BY '${SOC_MIGRATOR_DB_PASSWORD}';
  GRANT CREATE, DROP, ALTER, INDEX, REFERENCES, SELECT, INSERT, UPDATE, DELETE ON *.* TO 'soc_migrator'@'%';
  GRANT ALL PRIVILEGES ON \`${MYSQL_DATABASE}\`.* TO 'soc_migrator'@'%';

  -- Runtime application account: no DDL rights at all. Coarse grant here is
  -- narrowed to per-table (and audit_logs to insert-only) by
  -- harden-grants.sql immediately after the first migration runs.
  CREATE USER IF NOT EXISTS 'soc_app'@'%' IDENTIFIED BY '${SOC_APP_DB_PASSWORD}';
  GRANT SELECT, INSERT, UPDATE, DELETE ON \`${MYSQL_DATABASE}\`.* TO 'soc_app'@'%';

  FLUSH PRIVILEGES;
EOSQL

echo "soc_app and soc_migrator MariaDB accounts provisioned. Run harden-grants.sql after the first migration."
