# SOC Live Monitoring System — Phase 2: Node Management

## 1. Scope

Phase 2 delivers everything the spec's "Node Management" phase calls for, built on top of Phase 1's identity/RBAC/audit backbone:

- Admin Nodes page ("Integrations & Nodes")
- Encrypted credentials, stored separately from node configuration
- A real Test Connection workflow
- Health checks (per-node, history-tracked)
- Collector lifecycle controls (start/stop/restart/pause/resume, bulk start-all/stop-all, maintenance mode)

## 2. Data model additions

```
nodes ── 1:1 ── node_credentials   (separate table; AES-256-GCM ciphertext only)
  │
  ├── 1:N ── node_health_checks    (every test-connection / heartbeat run)
  │
  └── 1:1 ── collectors ── 1:N ── collector_runs
```

Full column-level detail is in `backend/prisma/schema.prisma` and the phpMyAdmin-importable `docs/db-schema.sql` (verified importable — see the test report). Key design choices carried over from the Phase 1 security model:

- **`node_credentials` is a separate table from `nodes`**, exactly as specified: a report or backup built from `nodes` alone never touches key material, even encrypted.
- **`audit_logs` stays insert-only** at the MariaDB grant level; Phase 2 doesn't touch that.
- **The `soc_app` MariaDB account's grants were extended** table-by-table for the five new tables (both in this sandbox's live database and in `docker/mariadb/harden-grants.sql` for a fresh deploy) — never a blanket schema-wide grant.

## 3. Test Connection workflow — what's genuinely tested vs. honestly deferred

The spec lists 10 steps. Steps 5–8 and 10 require a device-specific adapter (FortiOS/FortiWeb REST semantics, an LDAP client, a WebSocket event contract) that does not exist until Phase 3+. Rather than fake those as passing, `TestConnectionService` runs exactly what's genuinely verifiable generically right now, and reports the rest as `PENDING_ADAPTER`:

| Step | Name | Phase 2 status | How |
|---|---|---|---|
| 1 | DNS resolution | **Real** | Node's `dns.lookup` |
| 2 | TCP connectivity | **Real** | Raw `net.Socket` connect with the node's configured timeout |
| 3 | TLS certificate | **Real** | TLS handshake + certificate expiry read via Node's `https` client, honoring `tlsVerify`/custom CA |
| 4 | Authentication reachability | **Real, scoped** | For HTTP-API node types (FortiGate/FortiWeb) with an `apiBaseUrl`, sends the decrypted credential as a Bearer/Basic header and reports the HTTP status reached — this proves reachability and TLS/credential-format correctness, **not** that the credential is valid for the real API (that needs the Phase 3 adapter). Skipped for AD/GPO node types, which authenticate via LDAPS/PowerShell, not HTTP. |
| 5 | API compatibility | `PENDING_ADAPTER` | Needs to know the real endpoint shape |
| 6 | Required permissions | `PENDING_ADAPTER` | Needs a real authorized call to check against |
| 7 | Sample read request | `PENDING_ADAPTER` | Needs the adapter's real query |
| 8 | Response parsing | `PENDING_ADAPTER` | Needs the adapter's real parser |
| 9 | Database write test | **Real** | The health-check record this very run persists is itself the proof |
| 10 | WebSocket event delivery | `PENDING_ADAPTER` | The WS gateway doesn't exist until Phase 3 |

The collector's recurring heartbeat job intentionally runs only steps 1–3 (`TestConnectionService.runHeartbeat`), not the full 10-step workflow — hitting a real device's auth endpoint on every poll interval purely for our own health bookkeeping would be an abusive amount of traffic against production infrastructure once a real adapter exists behind it.

## 4. Collector lifecycle — the generic runtime Phase 3+ plugs into

There is no FortiGate/FortiWeb/AD data collection logic yet. What Phase 2 builds is the **lifecycle machinery** — start/stop/restart/pause/resume, bulk operations, maintenance mode, run history, error handling — using BullMQ (backed by Redis) so it is durable and horizontally scalable, not an in-memory `setInterval`. A Phase 3 adapter replaces the heartbeat processor's body with real data collection; the scheduling, state machine, and safety controls below don't change.

- **One BullMQ Job Scheduler per node** (`queue.upsertJobScheduler(nodeId, { every: pollingIntervalSeconds * 1000 }, ...)`), so state survives an app restart (it lives in Redis, not process memory).
- **Duplicate-click protection**: a 3-second Redis `SET NX` lock keyed per node, verified in this sandbox by firing two concurrent `stop` requests and getting exactly one 200 and one 409.
- **Re-authentication + explicit confirmation** on the sensitive operations: node deletion, credential rotation, start-all, stop-all, and maintenance-mode toggling all require the caller's current password (`ReAuthGuard`) in addition to the confirmation flag — enforced server-side regardless of what a frontend dialog does.
- **Graceful stop**: `removeJobScheduler` only prevents *future* ticks; an in-flight heartbeat job is left to finish so no run result is lost mid-flight.
- **"Alert on unexpected stop"**: if a heartbeat job throws, the collector is marked `ERROR` and an `audit_logs` entry (`COLLECTOR.UNEXPECTED_ERROR`) is written. This is the honest Phase 2 equivalent of "send an alert" — a full Alerting Engine (with its own notification channels) is a later, separate module per the spec, not part of Node Management.
- **Maintenance mode** is a `system_settings` row (`system.maintenance_mode`); enabling it pauses every currently running collector and blocks new starts/resumes until it's turned off.

## 5. What's still a Phase 3+ gap (by design)

- No real FortiGate/FortiWeb/AD data is ever collected — the heartbeat is connectivity-only.
- No Alerting Engine — collector failures are recorded, not (yet) pushed to anyone.
- No WebSocket gateway — nothing pushes live updates to the frontend; the Nodes page polls on demand via manual actions and page loads.
- Bulk start-all/stop-all iterate nodes sequentially, not in parallel — acceptable at Phase 2 scale, worth revisiting if a deployment has hundreds of nodes.
