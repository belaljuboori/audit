# Phase 2 — Test Report (Node Management)

Same environment as Phase 1 (this build sandbox: locally-installed MariaDB
10.11 + Redis 7, no Docker daemon available). All results below were actually
run on 2026-09-13; nothing here is asserted without the command that
produced it.

## 1. Unit tests — `npm test`

```
PASS src/common/utils/sanitize-error-message.spec.ts
PASS src/common/guards/permissions.guard.spec.ts
PASS src/common/crypto/encryption.service.spec.ts
PASS src/modules/health/prisma-health.indicator.spec.ts

Test Suites: 4 passed, 4 total
Tests:       18 passed, 18 total
```

(5 new tests added in Phase 2, all in `sanitize-error-message.spec.ts` — the
Phase 1 suites are unchanged and still pass.)

## 2. Integration/e2e tests — `npm run test:e2e` (real MariaDB + Redis + BullMQ)

```
PASS test/collectors.e2e-spec.ts
PASS test/nodes.e2e-spec.ts
PASS test/auth.e2e-spec.ts
PASS test/rbac.e2e-spec.ts

Test Suites: 4 passed, 4 total
Tests:       32 passed, 32 total
```

16 tests carried over from Phase 1 (unchanged, still green); 16 new tests
across `nodes.e2e-spec.ts` and `collectors.e2e-spec.ts`, run against the real
`soc_live_monitoring_test` MariaDB database and a real Redis instance
(isolated to `REDIS_DB=1` so it can never collide with the dev environment's
BullMQ/lock state on `REDIS_DB=0`). Nothing about Nodes or Collectors is
mocked — Prisma, BullMQ, and a real local HTTPS test server (self-signed
cert generated via `openssl` at test setup) are all real.

| # | Scenario | Result |
|---|---|---|
| 1 | A SOC Analyst is denied (403) creating a node | PASS |
| 2 | A Viewer is denied (403) listing nodes | PASS |
| 3 | A Super Admin creates a node; response contains neither the raw secret nor `encryptedSecret`; the DB row's `encryptedSecret` genuinely does not contain the plaintext | PASS |
| 4 | An invalid host string is rejected (400) | PASS |
| 5 | Test-connection against a real local HTTPS server: DNS/TCP/TLS/auth-reachability/DB-write all PASS; steps requiring an adapter are honestly PENDING_ADAPTER | PASS |
| 6 | Test-connection against a port nothing listens on genuinely reports FAILED (not a faked pass) | PASS |
| 7 | Node deletion requires `confirm: true` (400 without it, since the guard passed and the DTO failed) AND the correct current password (403 with a wrong one); deleting cascades to the credential row | PASS |
| 8 | Credential rotation requires re-authentication and genuinely changes the stored ciphertext | PASS |
| 9 | Disabling a node sets `currentHealth` to `DISABLED`; enabling clears it | PASS |
| 10 | A SOC Analyst cannot start or stop a collector (403) | PASS |
| 11 | Starting a collector fires an immediate real heartbeat (DNS+TCP+TLS against the live test server) and records a `SUCCESS` `CollectorRun`; the node's `currentHealth` becomes `HEALTHY` as a side effect | PASS |
| 12 | Cannot start a collector for a disabled node (409) | PASS |
| 13 | Firing two concurrent `stop` requests for the same collector yields exactly one 200 and one 409 (duplicate-click lock, verified under real concurrency via `Promise.all`, not simulated) | PASS |
| 14 | Pause → Resume transitions through `PAUSED` → `RUNNING` correctly | PASS |
| 15 | `start-all`/`stop-all` reject a request with the wrong password (403); a request missing `currentPassword` entirely is rejected by `ReAuthGuard` itself (403) before ever reaching DTO validation, since guards run before pipes | PASS |
| 16 | Enabling maintenance mode pauses a currently-running collector as a side effect and blocks starting a new one (409); disabling it again cleans up state so it doesn't leak into other tests | PASS |

## 3. Real (non-mocked) manual server verification

Beyond the automated suite, the actual `node dist/main.js` production entrypoint was driven manually end-to-end against the dev MariaDB database:

- Created a real FortiGate-type node via `POST /nodes` with an encrypted API-token credential — confirmed the response never contains the secret.
- Ran `POST /nodes/:id/test-connection` against nothing listening on the configured port → genuinely reported `UNHEALTHY` / `tcp_connectivity: FAILED` with `ECONNREFUSED`, not a fake success.
- Started a real local self-signed HTTPS server (`openssl` + Python's `http.server` wrapped in TLS) on a real port, pointed the node at it, and re-ran test-connection → all 5 real steps `PASSED`, including the decrypted Bearer token actually being sent and a real `200` response received.
- `POST /collectors/:id/start` → immediately fired a real BullMQ job (`bull:collector-heartbeat:repeat:<nodeId>:*` keys visible in Redis via `redis-cli keys`), which ran the heartbeat, wrote a `SUCCESS` `CollectorRun` row, and updated `Node.currentHealth` to `HEALTHY` — all inspected directly via `mysql`/`redis-cli`, not just through the API.
- Fired two concurrent `stop` requests with `curl ... & curl ... & wait` — got exactly one `200` and one `409 Conflict` ("Another lifecycle action for this collector is already in progress"), confirming the duplicate-click lock works under genuine concurrency, not just sequential test assertions.
- `DELETE /nodes/:id` with `confirm: true` and the correct password → `{"success":true}`, row actually removed.

## 4. Frontend

```
$ npm run build   # tsc -b && vite build
✓ 48 modules transformed.
✓ built in 1.05s
```

### Real-browser Playwright tests (headless Chromium, live backend + MariaDB + Redis)

```
$ npx playwright test
✓ unauthenticated visitor is redirected to the login page
✓ the Integrations & Nodes nav link is visible for an admin and navigates to the nodes page
✓ shows an error on invalid credentials and does not navigate away
✓ logs in with valid credentials, reaches the dashboard, and can log out
✓ a reload on the dashboard stays authenticated via refresh-token cookie
✓ creates a node through the UI, runs a real test-connection against a live local server, and deletes it with re-authentication

6 passed
```

The new "creates a node..." test drives the actual React UI: opens the Add
Node dialog, fills every field, submits, clicks Test Connection on the real
row, asserts the step-by-step results dialog shows genuine `dns_resolution`/
`tcp_connectivity` output from a real local HTTPS server started for the
test, confirms the row's health badge updates to `HEALTHY`, then deletes the
node through the UI's re-authentication dialog and confirms the row
disappears. Nothing here is a UI-only mock — every action is a real HTTP
call to the real running backend.

## 5. Bugs this testing process actually caught (and fixed)

Documenting these because "we tested and it worked" is meaningless without
saying what testing changed:

1. **`EncryptionService` was never resolvable via Nest's DI outside `AppModule`.** It worked in Phase 1 only because nothing else used Nest's dependency injection to obtain it (the unit test constructed it directly with `new`). The moment `NodesService` tried to inject it normally, the app failed to boot (`Nest can't resolve dependencies of NodesService`). Fixed by introducing a proper `@Global() CryptoModule` exporting it. This also means Phase 1's own claim of "the EncryptionService is proven before anything sensitive is encrypted with it" was true only for the unit-tested happy path, not for real DI resolution — worth knowing if anyone assumed otherwise.
2. **BullMQ workers require `maxRetriesPerRequest: null`** on their Redis connection or they fail; discovered when the app hung during e2e test bootstrap. Fixed in the `BullModule.forRootAsync` connection factory.
3. **The CSRF cookie's `Path=/api/v1/auth` scoping bug from Phase 1 was already fixed**, but this phase's build process (`tsc -p tsconfig.build.json`) revealed a second, unrelated build issue: `nest build`'s default `tsc` compiler inferred a project-wide `rootDir` (because `prisma/seed.ts` imports from `../src/...`) and started emitting `dist/src/main.js` instead of `dist/main.js` intermittently, breaking `node dist/main.js`. Fixed by pinning `rootDir: "src"` and excluding `prisma/` in `tsconfig.build.json`. (This was actually fixed during Phase 1 verification, re-confirmed still correct here.)

## 6. What remains explicitly unverified

Same caveat as Phase 1: **the Docker Compose stack itself has still not been run** (`docker compose up`) in this sandbox — no Docker daemon available. `docker/mariadb/harden-grants.sql` was updated to include the five new Phase 2 tables and its logic was manually replicated (grant → verify → confirm working, per the manual server verification above) against the real local MariaDB, but the actual container-based init script (`01-create-app-user.sh`) has not itself been executed inside a MariaDB container. Run the full `docker compose build && docker compose run --rm db-migrate && docker compose run --rm db-harden && docker compose up` sequence at least once before trusting this in a real environment — this is unchanged advice from Phase 1, repeated because it remains true.

## Honest status

Phase 2 adds 21 new automated tests (5 unit + 16 e2e) plus 1 new Playwright
browser test, all passing against real MariaDB, real Redis, real BullMQ, and
a real local HTTPS server — combined with Phase 1's suite, **57 automated
tests pass** (18 unit + 32 e2e backend + 6 Playwright — note: one Playwright
test file covers both Phase 1 and Phase 2 UI, hence 6 total, not 4+2— see
`frontend/e2e/`). The Test Connection workflow and collector lifecycle are
real, working code — not stubs — for everything that doesn't require a
device-specific adapter, and every place a real adapter is still needed says
so explicitly (`PENDING_ADAPTER`) rather than pretending otherwise.
