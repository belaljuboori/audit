# Known Limitations — End of Phase 1

Honest accounting of what Phase 1 does **not** do yet, so nothing here is
mistaken for a Phase 3–8 deliverable arriving early.

1. **No FortiGate, FortiWeb, or Active Directory connectivity exists.** The
   `nodes` table is a schema stub only (no API, no UI, no encryption of
   credentials in use yet) — it exists so later migrations can `ADD COLUMN`
   instead of creating the table from scratch. Real connectors start Phase 3.
2. **No Redis-backed job queue (BullMQ) is wired up yet.** Redis itself is
   deployed and health-checked (Phase 1 requirement), but nothing enqueues or
   processes jobs — that starts alongside the first real collector in Phase 3.
3. **No WebSocket/real-time gateway exists yet.** Nginx's `docker/nginx/nginx.conf`
   already has a `/ws/` proxy location prepared for it, unused until Phase 3.
4. **The Docker Compose stack has not been run end-to-end in this environment**
   (no Docker daemon available in this build sandbox). Backend, Prisma
   migrations, and grant-hardening were all validated against a real,
   locally-installed MariaDB + Redis instead. See `docs/phase1-test-report.md`
   §"What was explicitly NOT tested" for the precise, itemized gap and what
   to run before trusting the compose stack in a real environment.
5. **`nginx.conf` was syntax-checked but not run against a live backend
   inside a container.** See the test report for exactly which parts were
   and weren't verified.
6. **No MFA implementation.** The architecture is MFA-ready (a second-factor
   hook point exists conceptually in `AuthService.login`), but no second
   factor is implemented — explicitly out of scope until requested.
7. **Reports, compliance rules, GPO assessment, and least-privilege scoring
   do not exist yet.** Nothing in Phase 1 references PCI DSS requirement
   numbers or produces any report — that begins in Phases 6–7.
8. **No rate-limit persistence across restarts.** `@nestjs/throttler`'s
   default in-memory store is used; a backend restart resets throttle
   counters. Acceptable for Phase 1; revisit if a Redis-backed throttler
   store is wanted for a multi-instance deployment later.
9. **Only one deployment topology is assumed** (single host, Docker Compose).
   No HA, no read replicas, no clustering — not requested for Phase 1.
10. **The frontend is an authentication/RBAC shell only** — a working login
    page, protected route, and a page showing the current user's roles and
    permissions. None of the FortiGate/FortiWeb/AD/Compliance dashboards
    described in the full spec exist yet; that UI is built alongside each
    connector in its own phase.
11. **Demo Mode is a config flag (`DEMO_MODE=false`) with no demo data
    generator behind it yet.** Building fake-but-realistic FortiGate/FortiWeb/
    AD/GPO/PCI-DSS demo data only makes sense once those data shapes exist,
    starting Phase 3.
