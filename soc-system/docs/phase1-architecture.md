# SOC Live Monitoring System — Phase 1: Architecture & Foundation

## 1. Architecture Overview

### 1.1 Framework decision: NestJS (confirmed, with reasoning)

NestJS is used as requested. Reasoning for the record (in case a future maintainer asks "why not raw Express / Fastify"):

- **Module boundaries map 1:1 onto the spec's module list** (Auth, RBAC, Node Management, FortiGate Connector, FortiWeb Connector, AD Connector, Syslog Receiver, Compliance Engine, Reporting, Health, Audit, System Control, Dashboard API, WS Gateway). NestJS modules give real dependency-injection boundaries instead of ad-hoc `require()` wiring — important because Phase 3–6 connectors must be swappable per the Adapter pattern the spec mandates.
- **Built-in Guards/Interceptors/Pipes** map directly onto RBAC permission checks, audit-log interception, and Zod/class-validator input validation — this is exactly the cross-cutting concern shape the spec asks for (re-auth on sensitive ops, audit-log-everything, output shaping).
- **First-class Swagger/OpenAPI, WebSocket Gateway, BullMQ, and TypeORM/Prisma integration** are all official, maintained packages rather than glue code — reduces bespoke plumbing for a system that must run in production for years.
- **Testability**: Nest's `TestingModule` makes it straightforward to unit-test Guards (RBAC) and Interceptors (audit log) in isolation, which the spec explicitly requires ("لا يستطيع Analyst إضافة Node" etc. as unit-testable authorization rules).

Alternative considered and rejected: plain Express + manual layering. It would work, but every cross-cutting requirement in this spec (RBAC guards, audit interceptor, re-auth for sensitive ops, DTO validation, Swagger, WS gateway) would be hand-rolled and harder to keep consistent across 17 modules. Not worth it for a system of this size.

### 1.2 ORM decision: Prisma (confirmed, with reasoning)

- Prisma's migration engine + schema-as-source-of-truth is a better fit for a schema that will grow across 8 phases (30+ tables) than TypeORM's decorator-scattered entities.
- Prisma Client is fully parameterized (no raw string concatenation), which satisfies the "no SQL injection" requirement by construction for all standard CRUD; raw queries (needed for a few reporting aggregates) go through `$queryRaw` tagged templates, which are also parameterized.
- Prisma's generated types give compile-time safety across the DTO → Service → Repository boundary, which matters for a codebase this large with many contributors over time.
- Trade-off acknowledged: Prisma migrations are less flexible than hand-written SQL for very advanced MariaDB-specific DDL (e.g. some partitioning strategies for event retention). Where that's needed (event/log retention partitioning in later phases) we will drop to a raw SQL migration file executed via Prisma's `migrate diff`/custom migration support — documented when we get there.

### 1.3 High-level component diagram (Phase 1 scope in **bold**, later phases greyed for context)

```
                                   ┌─────────────────────────────┐
                                   │        Nginx (TLS term.)     │
                                   │  soc.bank.local  (reverse    │
                                   │  proxy + static frontend)    │
                                   └───────────────┬───────────────┘
                                                    │
                       ┌────────────────────────────┼────────────────────────────┐
                       │                            │                            │
              ┌────────▼────────┐         ┌─────────▼─────────┐        ┌─────────▼─────────┐
              │  React Frontend  │         │   NestJS API (HTTP) │        │  WS Gateway (later)│
              │  (Vite, RTL/LTR) │◄───────►│  **Auth**           │◄──────►│  Socket.IO          │
              └──────────────────┘  REST   │  **RBAC Guards**    │        │  (Phase 3+)         │
                                            │  **Audit Interceptor**│      └─────────────────────┘
                                            │  Node Mgmt (P2)      │
                                            │  Connectors (P3-P6)  │
                                            │  Compliance (P6)     │
                                            │  Reporting (P7)      │
                                            └─────────┬───────────┘
                                                       │ Prisma (mysql driver, TLS)
                                   ┌───────────────────┼────────────────────┐
                                   │                   │                    │
                          ┌────────▼────────┐ ┌────────▼────────┐ ┌────────▼────────┐
                          │   **MariaDB**    │ │   Redis (P2+)    │ │  BullMQ Workers  │
                          │  (app user,      │ │   BullMQ broker, │ │  Collectors      │
                          │   least-priv)    │ │   session cache  │ │  (Phase 3+)      │
                          └──────────────────┘ └──────────────────┘ └──────────────────┘
```

Phase 1 delivers the boxes in **bold**: HTTP API skeleton, Auth, RBAC guards, Audit interceptor, MariaDB connection via Prisma, and the Docker/Nginx scaffolding that every later phase plugs into. Redis/BullMQ infrastructure is stood up in Phase 1's Docker Compose (so Phase 2's collector lifecycle has something to attach to) but no queues/jobs are implemented yet.

### 1.4 Data-flow (Phase 1 slice)

```
Browser (React SPA)
   │ POST /api/v1/auth/login {username, password}  — HTTPS, CSRF token on subsequent state-changing calls
   ▼
Nginx (TLS terminates, forwards to backend:3000, adds security headers as defense-in-depth)
   ▼
NestJS AuthController
   │  ValidationPipe (class-validator DTO)
   │  AuthService.login()
   │      → Prisma: SELECT user by username (parameterized)
   │      → Argon2id.verify(hash, password)
   │      → on success: issue short-lived JWT access token (15 min) as response body
   │        + refresh token (7 days, rotated, stored hashed in `refresh_tokens` table) as
   │          Secure/HttpOnly/SameSite=Strict cookie
   │      → AuditInterceptor logs LOGIN_SUCCESS / LOGIN_FAILURE to `audit_logs` (immutable)
   ▼
Response → SPA stores access token in memory (never localStorage), refresh cookie handled by browser
   │
   ▼ subsequent requests
Authorization: Bearer <access token> → JwtAuthGuard → RolesGuard/PermissionsGuard (RBAC)
   → Controller → Service → Prisma → MariaDB
   → AuditInterceptor logs sensitive actions post-response
```

### 1.5 Threat model (STRIDE, Phase-1-relevant subset)

| # | Threat (STRIDE) | Asset | Phase 1 mitigation | Residual risk / future phase |
|---|---|---|---|---|
| T1 | Spoofing — credential stuffing / brute force login | User accounts | Argon2id hashing, account lockout after N failed attempts (progressive delay), rate limiting (per-IP + per-username) on `/auth/login`, generic error messages (no user enumeration) | MFA is architected for (pluggable second-factor hook in AuthService) but not implemented until explicitly scoped |
| T2 | Spoofing — stolen JWT/refresh token replay | Session integrity | Short-lived access tokens (15 min), refresh token **rotation** (old token invalidated on use, reuse-detection revokes the whole family), refresh token stored **hashed** (SHA-256) in DB, HttpOnly+Secure+SameSite cookies (mitigates XSS/CSRF token theft) | Device binding / IP-pinning left as a future hardening option (noted in hardening checklist) |
| T3 | Tampering — privilege escalation via RBAC bypass | Authorization boundary | Deny-by-default `PermissionsGuard`, permissions checked server-side on every route (never trust frontend), Super Admin role cannot be self-assigned via API, role/permission changes are themselves permission-gated (`roles.manage`) | Full negative-path RBAC test matrix required before Phase 1 sign-off (see test list) |
| T4 | Tampering — SQL injection | MariaDB | Prisma parameterized queries exclusively; no string-concatenated SQL anywhere; `$queryRaw` only with tagged templates | Static analysis / lint rule to forbid `queryRawUnsafe` added in CI (Phase 1) |
| T5 | Repudiation — admin denies performing a sensitive action | Accountability | `AuditInterceptor` + DB trigger: `audit_logs` rows are insert-only — the app DB user is granted no UPDATE/DELETE on that table at the MariaDB grant level | Long-term log shipping to a SIEM/WORM store is a later hardening item |
| T6 | Information Disclosure — secrets in logs/responses | Credentials, tokens | Pino redaction paths configured for `password`, `token`, `authorization`, `secret`, `apiKey`; DTOs use explicit `@Exclude()`/serialization allow-lists so passwordHash never leaves the service layer | Full grep-based test asserting no secret substrings appear in any captured log/response fixture |
| T7 | Denial of Service — login endpoint flooding | Availability | `@nestjs/throttler` global + stricter per-route limits on `/auth/*` | Full WAF/rate-limiting at the edge (Nginx `limit_req`) also configured |
| T8 | Elevation of Privilege — direct DB access bypassing the app | Data integrity | Application MariaDB user has only the exact grants it needs (no `SUPER`, no `GRANT OPTION`, no access to `mysql.*`); root/admin DB access reserved for phpMyAdmin on a separate, non-app credential | Documented in the DB hardening section below |
| T9 | SSRF (forward-looking, Phase 2+) | Internal network | Not exploitable yet (no outbound connectors exist in Phase 1) — noted here so the Node Management module (Phase 2) is designed with an allow-list from day one | Addressed when Node Management/Connectors land |

### 1.6 Security model summary (Phase 1 scope)

- **AuthN**: Argon2id password hashing (memory-hard, OWASP-recommended over bcrypt for new systems); JWT access tokens (HS256, 15 min TTL, signed with `JWT_ACCESS_SECRET`) + rotating refresh tokens (7 day TTL, opaque random value, only its SHA-256 hash stored, reuse detection). HS256 rather than RS256 was chosen because only this one API issues and verifies its own tokens in Phase 1 — there is no second service that needs to verify tokens with a public key while never holding the signing secret. If a future phase adds an independent verifier (e.g. a separate microservice), that's the point to move to RS256/ES256 and distribute only the public key.
- **AuthZ**: RBAC with the 5 roles specified (Super Admin, SOC Admin, SOC Analyst, Compliance Auditor, Viewer) and a fine-grained permission catalog (`nodes.read`, `nodes.create`, ..., `system.settings.manage`). Roles are DB rows (seed data), not hardcoded enums, so the admin can add custom roles later without a code change — permission *keys* remain code-defined (checked via decorator) because they gate real code paths.
- **Transport**: HTTPS-only via Nginx TLS termination; Helmet security headers; strict CORS allow-list (configured via env, no wildcard).
- **Cookies**: `Secure; HttpOnly; SameSite=Strict` for the refresh-token cookie; CSRF double-submit-token pattern for any cookie-authenticated state-changing request (defense-in-depth even though the access token is a bearer header, not a cookie).
- **Secrets at rest**: Phase 1 has no external device credentials yet, but the `EncryptionService` (AES-256-GCM, key from `MASTER_ENCRYPTION_KEY` env var) is built now because `node_credentials` (Phase 2) depends on it, and it's exercised by unit tests in Phase 1 so it's proven before anything sensitive is encrypted with it.
- **Audit**: every authentication event and every mutation on `users`, `roles`, `role_permissions`, `user_roles`, and `system_settings` is written to `audit_logs` (actor, action, target, before/after diff where safe, IP, user agent, timestamp, result).
- **DB least privilege**: a dedicated `soc_app` MariaDB user with `SELECT, INSERT, UPDATE, DELETE` on the `soc_live_monitoring` schema's tables only, explicitly **no** `DROP`, `ALTER`, `SUPER`, or `GRANT OPTION`; migrations run with a separate, more-privileged `soc_migrator` user used only by the deploy pipeline, never by the running application.

## 2. Folder structure (monorepo)

```
soc-system/
├── backend/                          # NestJS + TypeScript API
│   ├── prisma/
│   │   ├── schema.prisma
│   │   ├── migrations/
│   │   └── seed.ts
│   ├── src/
│   │   ├── main.ts
│   │   ├── app.module.ts
│   │   ├── common/
│   │   │   ├── decorators/           # @Permissions(), @CurrentUser(), @Public()
│   │   │   ├── guards/                # JwtAuthGuard, PermissionsGuard, ReAuthGuard
│   │   │   ├── interceptors/          # AuditLogInterceptor, TransformInterceptor
│   │   │   ├── filters/               # AllExceptionsFilter (no stack leaks, no secrets)
│   │   │   ├── pipes/
│   │   │   └── crypto/                # EncryptionService (AES-256-GCM)
│   │   ├── config/                   # typed config module (env validation via Zod)
│   │   ├── database/                 # PrismaService, PrismaModule
│   │   ├── modules/
│   │   │   ├── auth/                 # Phase 1
│   │   │   ├── users/                # Phase 1
│   │   │   ├── rbac/                 # Phase 1 (roles, permissions)
│   │   │   ├── audit-log/            # Phase 1
│   │   │   ├── system-settings/      # Phase 1 (stub)
│   │   │   ├── health/               # Phase 1 (basic: API + DB + Redis)
│   │   │   ├── nodes/                # Phase 2 stub only
│   │   │   ├── fortigate/            # Phase 3 (empty in P1)
│   │   │   ├── fortiweb/             # Phase 4 (empty in P1)
│   │   │   ├── active-directory/     # Phase 5 (empty in P1)
│   │   │   ├── compliance/           # Phase 6 (empty in P1)
│   │   │   ├── reporting/            # Phase 7 (empty in P1)
│   │   │   └── realtime/             # Phase 3 (empty in P1)
│   │   └── test-utils/
│   ├── test/                         # e2e (Supertest) specs
│   ├── .env.example
│   ├── nest-cli.json
│   ├── package.json
│   └── tsconfig.json
├── frontend/                         # React + Vite + TypeScript
│   ├── src/
│   │   ├── main.tsx
│   │   ├── app/                      # router, providers, i18n (ar/en, RTL/LTR)
│   │   ├── features/
│   │   │   └── auth/                 # login page, auth store (Phase 1)
│   │   ├── shared/
│   │   │   ├── api/                  # typed API client (axios + interceptors)
│   │   │   ├── theme/                # Dark SOC theme tokens
│   │   │   └── components/
│   │   └── i18n/
│   ├── index.html
│   ├── vite.config.ts
│   └── package.json
├── docker/
│   ├── docker-compose.yml
│   ├── docker-compose.prod.yml
│   ├── nginx/
│   │   └── nginx.conf
│   └── mariadb/
│       └── init/
│           └── 01-app-user.sql       # creates least-privilege soc_app user
├── docs/
│   ├── phase1-architecture.md        # this file
│   ├── er-diagram.md
│   └── db-schema.sql                 # phpMyAdmin-importable
└── README.md
```

## 3. Database ERD — Phase 1 tables

Phase 1 implements the identity/authorization/audit backbone. Later phases add `nodes`, `node_credentials`, `fortigate_*`, `ad_*`, `gpo_*`, `compliance_*`, `reports`, etc. as their own migrations — nothing here is a placeholder table for functionality that doesn't exist yet (per the "no dead scaffolding" instruction), except `system_settings` (needed now to store e.g. session TTL, lockout policy — actively read by AuthService) and a minimal `nodes` table used only so `audit_logs.target_type` has a real, referenceable domain to validate against later; this stub table exists **without** a UI or API in Phase 1.

```
┌───────────────┐       ┌────────────────────┐       ┌───────────────┐
│    roles      │       │   role_permissions  │       │  permissions  │
├───────────────┤       ├────────────────────┤       ├───────────────┤
│ id (PK)       │──1:N──│ role_id (FK)        │──N:1──│ id (PK)       │
│ name          │       │ permission_id (FK)  │       │ key (unique)  │
│ description   │       │ created_at          │       │ description   │
│ is_system     │       └────────────────────┘       └───────────────┘
│ created_at    │
│ updated_at    │
└───────┬───────┘
        │ 1:N
┌───────▼───────┐       ┌────────────────────┐
│  user_roles   │       │       users         │
├───────────────┤       ├────────────────────┤
│ user_id (FK)  │──N:1──│ id (PK)             │
│ role_id (FK)  │       │ username (unique)   │
│ assigned_at   │       │ email (unique)      │
│ assigned_by   │       │ password_hash       │
└───────────────┘       │ full_name           │
                         │ status (enum)       │
                         │ failed_login_count  │
                         │ locked_until        │
                         │ last_login_at       │
                         │ last_login_ip       │
                         │ password_changed_at │
                         │ must_change_password│
                         │ created_at          │
                         │ updated_at          │
                         └──────────┬───────────┘
                                    │ 1:N
                         ┌──────────▼───────────┐
                         │   refresh_tokens      │
                         ├──────────────────────┤
                         │ id (PK)              │
                         │ user_id (FK)         │
                         │ token_hash (unique)  │
                         │ family_id            │  ← rotation family for reuse-detection
                         │ issued_at            │
                         │ expires_at           │
                         │ revoked_at           │
                         │ replaced_by_id       │
                         │ ip_address           │
                         │ user_agent           │
                         └──────────────────────┘

┌────────────────────────────────────────────┐
│                 audit_logs                   │   (INSERT-only at DB grant level)
├──────────────────────────────────────────────┤
│ id (PK, BIGINT)                              │
│ actor_user_id (FK, nullable → users)         │
│ actor_username_snapshot                      │  ← survives user deletion
│ action (string, e.g. "AUTH.LOGIN_SUCCESS")   │
│ target_type (string, e.g. "user","node")     │
│ target_id (string, nullable)                 │
│ result (enum: SUCCESS/FAILURE/DENIED)        │
│ ip_address                                   │
│ user_agent                                   │
│ metadata (JSON — before/after, reason, etc.) │
│ created_at (immutable)                       │
└──────────────────────────────────────────────┘

┌───────────────────────┐
│   system_settings      │
├───────────────────────┤
│ key (PK)               │
│ value (JSON)           │
│ description            │
│ updated_by (FK→users)  │
│ updated_at             │
└───────────────────────┘

┌───────────────────────┐   (stub only — no API/UI yet, exists for FK integrity
│        nodes           │    of audit_logs.target_type in future phases; full
├───────────────────────┤    column set lands in Phase 2)
│ id (PK, UUID)          │
│ name                   │
│ type (enum)            │
│ created_at             │
└───────────────────────┘
```

Full column-level Prisma schema is in `backend/prisma/schema.prisma`; the phpMyAdmin-importable raw SQL is in `docs/db-schema.sql`.

## 4. Assumptions (Phase 1)

1. No real FortiGate/FortiWeb/AD connectivity is required for Phase 1 — those integrations start in Phases 3–5 and I will ask for FortiOS/FortiWeb firmware versions and AD environment details **at that point**, not now.
2. "Demo Mode" data generation also starts once there is something to demo (Phase 3+); Phase 1 seeds only the identity backbone (roles, permissions, one bootstrap Super Admin) — no fake security events yet.
3. Single-region deployment assumed for Phase 1 infra (Docker Compose on one host); HA/clustering is out of scope unless requested later.
4. The existing `server.js` / `audit-app.zip` prototype in the repo root is an unrelated legacy tool ("نظام التدقيق المصرفي" — a manual record-entry app) and is left untouched; the new system lives entirely under `soc-system/`.
5. TLS certificates for Nginx in local/dev Docker Compose are self-signed (generated by a setup script); production certs are assumed to be supplied by the bank's PKI/CA per their standard process.
6. The sandbox used to build and test Phase 1 has no Docker daemon available, so Phase 1 automated tests run against a MariaDB + Redis installed directly in the build environment rather than via `docker-compose up`. The Docker Compose files are still written and will be the actual deployment path; I'll note this explicitly in the test report rather than claim container-based integration was verified.
7. `MASTER_ENCRYPTION_KEY`, JWT signing keys, and all DB passwords are supplied via environment variables / secret manager — never requested from the user in chat, never committed.

## 5. Information needed from you later (not blocking Phase 1)

These are **not needed now** — Phase 1 has no external connectors — but flagging them so Phase 2/3 isn't blocked when we get there:

- FortiOS version(s) in use (per firewall, if they differ) — determines which REST API endpoints/fields are valid.
- FortiWeb firmware version(s) — same reason.
- Whether FortiGate API access will be via a local API admin + API key, or a dedicated read-only administrator profile with trusted-host restrictions.
- AD forest/domain functional level, and whether a dedicated read-only service account will be pre-provisioned for LDAPS.
- Whether the Windows GPO collector will run on a dedicated member server you'll provision, or whether GPO data will be delivered as `Get-GPOReport` XML exports instead.
- Target deployment host OS for Docker Compose (for the installation guide) and whether the bank's internal CA issues the TLS certs or Let's Encrypt is acceptable for non-internet-facing use.

None of this blocks Phase 1 — proceeding now.
