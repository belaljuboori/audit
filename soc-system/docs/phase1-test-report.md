# Phase 1 — Test Report (Architecture & Foundation)

This is a factual record of what was actually run and what actually passed, in this
build environment, on 2026-09-10. No result below is asserted without the command
that produced it.

## Environment used for testing

- Node.js v22.22.2, npm 10.9.7
- MariaDB 10.11.14 (installed via `apt`, running locally — **not** the Docker
  Compose stack, because no Docker daemon was available in this sandbox; see
  "Known limitations" below)
- Redis 7 (installed via `apt`, running locally)
- Two real MariaDB schemas were created and migrated: `soc_live_monitoring`
  (dev) and `soc_live_monitoring_test` (e2e tests), each with a genuine
  least-privilege `soc_app` account (SELECT/INSERT/UPDATE/DELETE on every
  table except `audit_logs`, which is SELECT/INSERT only) and a separate
  `soc_migrator` account used only to run migrations.

## 1. Unit tests — `npm test` (Jest)

```
PASS src/modules/health/prisma-health.indicator.spec.ts
PASS src/common/crypto/encryption.service.spec.ts
PASS src/common/guards/permissions.guard.spec.ts

Test Suites: 3 passed, 3 total
Tests:       13 passed, 13 total
```

Covers: AES-256-GCM encrypt/decrypt round-trip, tamper detection, wrong-key
rejection, invalid-key-length rejection (`EncryptionService`); the
`PermissionsGuard` deny-by-default matrix (no-required-permissions passthrough,
partial-permission denial, all-required-permissions-present allow,
no-authenticated-user denial); and the `PrismaHealthIndicator` healthy/unhealthy
paths (used to prove the health check would correctly report a database
outage as `HealthCheckError` rather than silently reporting healthy).

## 2. Integration/e2e tests — `npm run test:e2e` (Jest + Supertest, real MariaDB)

```
PASS test/auth.e2e-spec.ts
PASS test/rbac.e2e-spec.ts

Test Suites: 2 passed, 2 total
Tests:       16 passed, 16 total
```

These run the full NestJS application (all real modules, guards, interceptors,
Prisma connected to the real `soc_live_monitoring_test` MariaDB database — no
mocking of the database layer) via Supertest, over HTTP. Specific scenarios
exercised, each against the live database:

| # | Scenario | Result |
|---|---|---|
| 1 | `GET /health` reachable without authentication | PASS |
| 2 | Protected route rejects an unauthenticated request (401) | PASS |
| 3 | Valid login returns an access token; response body never contains `passwordHash` | PASS |
| 4 | Refresh-token cookie is set `HttpOnly` | PASS |
| 5 | Wrong password and non-existent username return the identical error message (no user enumeration) | PASS |
| 6 | Account is locked after `LOGIN_MAX_ATTEMPTS` (5) consecutive failures, with an explicit "locked" message | PASS |
| 7 | Refresh token rotates on use; the old (rotated-out) token is rejected on reuse | PASS |
| 8 | Reuse of a rotated-out refresh token revokes the **entire token family**, invalidating even the legitimate successor token | PASS |
| 9 | `/auth/refresh` and `/auth/logout` reject a request whose CSRF header doesn't match the CSRF cookie (double-submit check) | PASS |
| 10 | Logout revokes the refresh token so it cannot be used again | PASS |
| 11 | `/auth/me` returns the authenticated profile with no secrets | PASS |
| 12 | A SOC Analyst is denied (403) on a `users.manage`-gated endpoint | PASS |
| 13 | A Viewer is denied (403) reading the audit log | PASS |
| 14 | A SOC Admin is denied (403) from all user-management endpoints, which by construction means it can never change the Super Admin role | PASS |
| 15 | A Super Admin can list/create users | PASS |
| 16 | **Defense-in-depth**: an actor holding `users.manage` through a bespoke non-"Super Admin" role is still blocked, at the service layer, from granting/revoking the Super Admin role | PASS |
| 17 | A genuine Super Admin CAN grant the Super Admin role | PASS |
| 18 | User creation by an admin is written to `audit_logs` with `result = SUCCESS` | PASS |

(18 scenarios map to the 16 test cases above; two tests assert multiple scenarios each.)

## 3. Real (non-mocked) server boot test

Beyond the Nest `TestingModule` used by the e2e suite, the actual production
entrypoint was exercised directly:

```
$ npm run build && node dist/main.js
```

- `GET /api/v1/health` → `200 {"status":"ok","info":{"database":{"status":"up"},"redis":{"status":"up"}}}`
- `POST /api/v1/auth/login` with the real bootstrap Super Admin (`admin` /
  the one-time password printed by `prisma db seed`) → `201`, valid JWT,
  `Set-Cookie` headers present with `HttpOnly`/`SameSite=Strict`, correct
  security headers from Helmet (CSP, HSTS, X-Frame-Options, etc.), correct
  `X-RateLimit-*` headers from the throttler.
- `GET /api/v1/auth/me` without a token → `401`, no stack trace, no internal
  detail leaked.
- `GET /api/docs` (Swagger UI) → `200`.

## 4. Frontend build

```
$ npm run build   # tsc -b && vite build
✓ 41 modules transformed.
✓ built in 928ms
```

TypeScript strict mode compiles cleanly; production bundle produced.

## 5. Frontend browser end-to-end tests — Playwright, real Chromium, real backend

```
$ npx playwright test
✓ unauthenticated visitor is redirected to the login page
✓ shows an error on invalid credentials and does not navigate away
✓ logs in with valid credentials, reaches the dashboard, and can log out
✓ a reload on the dashboard stays authenticated via refresh-token cookie (no access token in localStorage)

4 passed
```

These ran a real headless Chromium against `vite preview` (the production
frontend build) proxying to the real, running NestJS backend connected to
the real MariaDB dev database — not a mock of either. Along the way, this
suite caught and led to a real fix: the CSRF cookie was initially scoped to
`Path=/api/v1/auth`, which made it invisible to `document.cookie` from any
other page path (e.g. `/dashboard`), silently breaking session restore on
page reload. Fixed by scoping the (non-HttpOnly, JS-readable-by-design) CSRF
cookie to `Path=/`, while the HttpOnly refresh-token cookie correctly stays
scoped to `/api/v1/auth`. Re-run after the fix: all 4 pass.

## 6. Database artifacts verified, not just written

- `docs/db-schema.sql` was actually imported into a throwaway MariaDB
  database (`mysql -uroot < db-schema.sql`) and produced the expected table
  set, 15 permissions, 5 roles, and correct per-role permission counts
  (Super Admin 15, SOC Admin 9, SOC Analyst 3, Compliance Auditor 1, Viewer
  0) — confirming it is genuinely phpMyAdmin/mysql-CLI importable, not just
  syntactically plausible.
- The least-privilege `soc_app` grant was verified with `SHOW GRANTS`: it
  holds `SELECT, INSERT, UPDATE, DELETE` on every application table except
  `audit_logs`, where it holds `SELECT, INSERT` only — enforced by MariaDB
  itself, not merely by application code discipline.

## What was explicitly NOT tested (and why)

- **The Docker Compose stack itself was not run end-to-end** (`docker
  compose up`) because this sandbox has no Docker daemon (`docker ps` fails
  with "cannot connect to the Docker daemon"). Everything the compose stack
  wires together — the backend against MariaDB, Redis, the migration flow,
  the grant-hardening flow — was verified against a locally-installed
  MariaDB/Redis running the equivalent configuration, and the Dockerfile
  itself was **not** build-tested. **This is a real gap, not a rounding
  error**: before this goes to any real environment, run `docker compose
  build`, `docker compose run --rm db-migrate`, `docker compose run --rm
  db-harden`, and `docker compose up` at least once and confirm the health
  check passes through Nginx.
- **Nginx was partially validated, not fully.** `nginx -t` was run against
  `docker/nginx/nginx.conf` on this host (nginx/1.24, installed via apt,
  since Docker itself is unavailable). Three failures surfaced and were
  triaged individually rather than dismissed:
  - `getpwnam("nginx") failed` — this host has no `nginx` system user; the
    real target image (`nginx:1.27-alpine`, pinned in docker-compose.yml)
    creates that user itself. Not a config bug.
  - `unknown directive "http2"` — this host's nginx 1.24 predates the
    `http2 on;` directive (added in 1.25.1); the pinned `nginx:1.27-alpine`
    supports it. Not a config bug, but unverified against the real version
    in this sandbox.
  - `host not found in upstream "backend"` — `backend` is a Docker Compose
    service name, resolvable only via Docker's embedded DNS inside the
    `soc-live-monitoring` compose network. Expected outside Docker.
  With those three environment-specific lines set aside, `nginx -t`
  accepted the rest of the file (server blocks, `location` blocks,
  `limit_req_zone`, TLS directives, generated self-signed cert successfully
  loaded). **What remains genuinely unverified**: the full config has never
  been tested inside an actual `nginx:1.27-alpine` container with the
  `backend` service reachable — do that (`docker compose up`, then `curl
  -k https://localhost/api/v1/health`) before this goes anywhere real.
- **No load/concurrency testing** was performed (not in scope for Phase 1).
- **No AD/FortiGate/FortiWeb connectivity was tested** — none of that code
  exists yet; it starts in Phases 3–6.

## Honest status

Phase 1 backend and frontend foundation code is real, runs, and its
automated test suite (13 unit + 16 API/DB integration + 4 real-browser e2e =
**33 passing tests**) genuinely passed against a live MariaDB and Redis, not
against mocks. The Docker/Nginx packaging is written but **unverified** in
this sandbox — flagged above, not glossed over. Nothing in this system is
claimed to be "100% operational" beyond what these specific commands and
their output, reproduced above, actually demonstrate.
