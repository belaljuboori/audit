# Known Limitations — End of Phase 2

Builds on `known-limitations-phase1.md` (still accurate) — this file covers
what's new or changed by Node Management.

1. **No real device data collection exists.** The collector heartbeat is
   connectivity-only (DNS/TCP/TLS) — it does not pull VPN sessions, threat
   logs, AD objects, or anything else. That starts Phase 3 (FortiGate).
2. **Test Connection steps 5, 6, 7, 8, and 10 are honestly `PENDING_ADAPTER`**,
   not implemented — see `docs/phase2-architecture.md` §3 for exactly why
   each one needs a device-specific adapter that doesn't exist yet.
3. **No Alerting Engine.** An unexpected collector failure is recorded as an
   `ERROR` status and an `audit_logs` entry — nobody is paged or emailed.
   The spec's full Alerting Engine is a separate, later module.
4. **No WebSocket gateway yet.** The Nodes page has no live-updating rows;
   an admin has to click Test Connection or reload to see current state.
   The Nginx config already has a `/ws/` location ready for when this lands.
5. **Bulk start-all/stop-all are sequential**, not parallelized — fine at
   the node counts expected in Phase 2 testing, worth revisiting at scale.
6. **The Docker Compose stack (including the updated grant-hardening
   script) has still not been run end-to-end** — see the Phase 2 test
   report's "what remains explicitly unverified" section. This is the same
   gap as Phase 1, now covering more tables.
7. **The Nodes admin page frontend is functional but not feature-complete
   against the full spec.** It supports create/list/enable/disable/delete/
   rotate-credential/test-connection/start/stop/restart. It does NOT yet
   support: editing a node's non-secret fields via the UI (the API supports
   `PATCH /nodes/:id`, but no edit form exists yet), viewing a node's TLS
   certificate details or health-check history in the UI (both exist as API
   endpoints — `GET /nodes/:id/health-history` — but have no UI), uploading
   a custom CA certificate through a file picker (the API accepts a PEM
   string field, entered as raw text if used at all), or a maintenance-mode
   toggle in the UI (API-only for now, exercised via the automated tests).
8. **`pollingIntervalSeconds` has a hard minimum of 30 seconds** — a
   deliberate choice to avoid a misconfigured node hammering a device or
   this app's own DB every few seconds; the spec's "polling interval"
   requirement is satisfied but the floor was our own design decision, not
   something explicitly specified as 30s.
