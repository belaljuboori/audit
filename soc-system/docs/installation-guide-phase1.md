# Installation Guide — Phase 1

Covers what exists at the end of Phase 1 only (identity/RBAC/audit backbone).
This will be superseded by a full installation guide once connectors,
reporting, and compliance land in later phases.

## Option A — Local development (no Docker)

Prerequisites: Node.js 20+, MariaDB 10.11+, Redis 7+.

```bash
# 1. Create the database and least-privilege accounts (see
#    docker/mariadb/init/01-create-app-user.sh for the exact grants, or run
#    equivalent statements manually against your local MariaDB as root).

# 2. Backend
cd backend
cp .env.example .env
# edit .env: DATABASE_URL, JWT_ACCESS_SECRET (openssl rand -base64 64),
# MASTER_ENCRYPTION_KEY (openssl rand -hex 32), REDIS_* to match your local setup
npm install
npx prisma migrate dev --name init      # first time only
SEED_SUPER_ADMIN_PASSWORD='...' npx prisma db seed   # or omit the var to get
                                                       # a one-time generated password printed to the console
npm run build
node dist/main.js
# API now on http://localhost:3000/api/v1, Swagger on /api/docs

# 3. Frontend
cd ../frontend
npm install
npm run dev
# SPA on http://localhost:5173, proxies /api to the backend on :3000
```

## Option B — Docker Compose

**Not yet verified end-to-end in this build environment** (no Docker daemon
available — see `docs/phase1-test-report.md`). Steps as designed:

```bash
cd docker
cp .env.example .env
# fill in every CHANGE_ME value with a real generated secret

docker compose build
docker compose up -d mariadb redis
docker compose run --rm db-migrate     # runs `prisma migrate deploy` + seed;
                                        # the bootstrap Super Admin's one-time
                                        # password is printed to this command's
                                        # own output — copy it immediately
docker compose run --rm db-harden      # narrows soc_app's audit_logs grant to
                                        # insert-only (must run exactly once,
                                        # after the first db-migrate)
docker compose up -d backend nginx

# Generate a self-signed dev certificate if you don't have a real one yet:
mkdir -p docker/nginx/tls
openssl req -x509 -newkey rsa:2048 -nodes \
  -keyout docker/nginx/tls/server.key -out docker/nginx/tls/server.crt \
  -days 365 -subj "/CN=soc.bank.local"
```

Then browse to `https://soc.bank.local` (or add a `/etc/hosts` entry pointing
it at your Docker host) and accept the self-signed certificate warning in dev.

phpMyAdmin (DBA-only access — never used by the application) is available on
demand: `docker compose --profile dba up -d phpmyadmin`, bound to
`127.0.0.1:8081` only.

## First login

1. Look for the one-time bootstrap Super Admin password printed by the seed
   step (console output of `prisma db seed` / `docker compose run --rm
   db-migrate`). It is never stored anywhere in plaintext and is not
   recoverable if you lose it — if that happens, reset the account's
   `password_hash` directly, or delete and re-seed in a non-production
   environment.
2. Log in with `admin` (or whatever `SEED_SUPER_ADMIN_USERNAME` was set to)
   and that password. The account has `mustChangePassword = true` set — a
   password-change-enforcement UI flow is not yet built in Phase 1's minimal
   frontend shell; for now, change it via `PATCH` against a future users
   endpoint or directly update `password_hash` with a freshly Argon2id-hashed
   value until that UI lands.

## Running the test suites

```bash
cd backend
npm test                 # unit tests
npm run test:e2e         # API/DB integration tests — needs a real MariaDB +
                          # Redis reachable via .env.test, and that database
                          # must already be migrated + seeded (see
                          # docs/phase1-test-report.md for the exact commands
                          # used to set that up in this build)

cd ../frontend
npm run build
npx playwright test      # needs the backend running on :3000 and a seeded
                          # Super Admin account matching E2E_ADMIN_USERNAME /
                          # E2E_ADMIN_PASSWORD env vars (defaults match the
                          # example bootstrap credentials used during
                          # Phase 1 development — override for your own DB)
```
