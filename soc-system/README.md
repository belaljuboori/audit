# SOC Live Monitoring System

Enterprise SOC platform for a banking environment: live monitoring of
FortiGate and FortiWeb, Active Directory auditing and least-privilege
analysis, GPO/PCI DSS v4.0.1 compliance assessment, reporting, and
centralized administration — built incrementally, phase by phase, with each
phase's tests run and reported before moving to the next.

> This is a separate, unrelated system from the legacy `audit-app` /
> `server.js` prototype at the repository root (a simple manual
> record-entry tool). Nothing here modifies or depends on that code.

## Status: Phase 1 complete (Architecture & Foundation)

See `docs/phase1-architecture.md` for the full design (architecture,
threat model, folder structure, ERD, security model, assumptions) and
`docs/phase1-test-report.md` for the actual, reproduced test results —
including an honest list of what has and hasn't been verified yet.

What exists right now: project scaffolding for the backend (NestJS +
TypeScript + Prisma + MariaDB) and frontend (React + Vite + TypeScript),
Argon2id authentication with rotating-refresh-token sessions, fine-grained
RBAC (5 default roles, permission-catalog-driven), an insert-only
administrative audit log enforced at the database grant level, health
checks, and a Docker Compose / Nginx deployment topology.

What does not exist yet: FortiGate/FortiWeb/Active Directory connectors,
GPO assessment, PCI DSS compliance mapping, reporting, and the full
dashboard UI — see `docs/known-limitations-phase1.md` and the phase plan
below.

## Repository layout

```
soc-system/
├── backend/     NestJS + TypeScript API (see backend/prisma/schema.prisma for the data model)
├── frontend/    React + Vite + TypeScript SPA (Arabic/English, RTL/LTR, dark SOC theme)
├── docker/      docker-compose.yml, Nginx config, MariaDB init/hardening scripts
└── docs/        Architecture, ERD, DB schema (phpMyAdmin-importable), test reports, guides
```

## Quick start

See `docs/installation-guide-phase1.md`.

## Phase plan

1. **Architecture & Foundation** — ✅ this delivery
2. Node Management (Admin Nodes page, encrypted credentials, connection testing, collector lifecycle)
3. FortiGate (REST + Syslog, VPN sessions, WAN threats, live dashboard)
4. FortiWeb (attack log parsing, live attacks dashboard, data masking)
5. Active Directory (LDAPS, nested privilege resolution, least-privilege risk engine)
6. GPO & PCI DSS (Windows GPO collector, compliance rule catalog, evidence workflow)
7. Reports & Operations (PDF/XLSX/CSV, scheduled reports, service control, backups)
8. Verification (full automated/security/performance test pass, final documentation)
