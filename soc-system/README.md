# SOC Live Monitoring System

Enterprise SOC platform for a banking environment: live monitoring of
FortiGate and FortiWeb, Active Directory auditing and least-privilege
analysis, GPO/PCI DSS v4.0.1 compliance assessment, reporting, and
centralized administration — built incrementally, phase by phase, with each
phase's tests run and reported before moving to the next.

> This is a separate, unrelated system from the legacy `audit-app` /
> `server.js` prototype at the repository root (a simple manual
> record-entry tool). Nothing here modifies or depends on that code.

## Status: Phase 2 complete (Node Management)

See `docs/phase1-architecture.md` / `docs/phase2-architecture.md` for the
full design (architecture, threat model, folder structure, ERD, security
model, assumptions) and `docs/phase1-test-report.md` /
`docs/phase2-test-report.md` for the actual, reproduced test results —
including an honest list of what has and hasn't been verified yet.

What exists right now: the Phase 1 foundation (NestJS + TypeScript + Prisma
+ MariaDB backend, React + Vite + TypeScript frontend, Argon2id auth with
rotating-refresh-token sessions, fine-grained RBAC, an insert-only
administrative audit log enforced at the database grant level, health
checks, Docker Compose / Nginx topology) plus Phase 2's Node Management:
full node CRUD with AES-256-GCM-encrypted credentials stored in their own
table, a real (not mocked) Test Connection workflow, and a BullMQ/Redis-
backed collector lifecycle (start/stop/restart/pause/resume, bulk
operations, maintenance mode, re-authentication on sensitive actions,
duplicate-click protection) — exposed through an "Integrations & Nodes"
admin page in the frontend.

What does not exist yet: FortiGate/FortiWeb/Active Directory data
collection, GPO assessment, PCI DSS compliance mapping, reporting, an
Alerting Engine, and the full dashboard UI — see
`docs/known-limitations-phase2.md` and the phase plan below.

## Repository layout

```
soc-system/
├── backend/     NestJS + TypeScript API (see backend/prisma/schema.prisma for the data model)
├── frontend/    React + Vite + TypeScript SPA (Arabic/English, RTL/LTR, dark SOC theme)
├── docker/      docker-compose.yml, Nginx config, MariaDB init/hardening scripts
└── docs/        Architecture, ERD, DB schema (phpMyAdmin-importable), test reports, guides
```

## Quick start

See `docs/installation-guide-phase1.md` (still accurate for setup) and
`docs/phase2-architecture.md` for what Node Management adds on top.

## Phase plan

1. **Architecture & Foundation** — ✅ complete
2. **Node Management** (Admin Nodes page, encrypted credentials, connection testing, collector lifecycle) — ✅ complete
3. FortiGate (REST + Syslog, VPN sessions, WAN threats, live dashboard)
4. FortiWeb (attack log parsing, live attacks dashboard, data masking)
5. Active Directory (LDAPS, nested privilege resolution, least-privilege risk engine)
6. GPO & PCI DSS (Windows GPO collector, compliance rule catalog, evidence workflow)
7. Reports & Operations (PDF/XLSX/CSV, scheduled reports, service control, backups)
8. Verification (full automated/security/performance test pass, final documentation)
