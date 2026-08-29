# 10 — Reconcile scheduled deadline stages

**What to build:** Generate and reconcile Vehicle deadline Notification stages as calendar time advances, making the process restart-safe, multi-instance-safe and able to invalidate stale communication without producing historical spam.

**Blocked by:** 09 — Persist the first Vehicle Deadline Notification

**Status:** resolved

- [x] A feature-owned bootstrap/interval processor scans every 15 minutes outside tests and exposes an explicit deterministic cycle for automated testing.
- [x] A cycle begins generating a threshold at the first scan on or after 08:00 in the Workspace time zone.
- [x] Each configured lead day can create one immutable stage; an outage catch-up creates only the most urgent currently crossed stage and never earlier missing stages.
- [x] Due-day catch-up is permitted through seven overdue calendar days and suppressed from the eighth day onward while the Alert remains active.
- [x] Policy activation boundaries prevent rollout and policy-edit backlog while allowing genuinely future stages.
- [x] Concurrent cycles in one process do not overlap and concurrent backend instances remain correct through PostgreSQL uniqueness.
- [x] Reconciliation invalidates Notifications after deadline change, Vehicle removal or deadline-kind disablement and cancels their nonterminal optional Deliveries.
- [x] Existing valid Notifications are not invalidated merely because their lead day is later removed while the kind and source date remain valid.
- [x] Invalid Notifications receive an invalidation timestamp and are deleted with typed details, recipients and deliveries after 90 days.
- [x] Startup/cycle failures are structured and logged without rejecting application bootstrap.
- [x] Unit, PostgreSQL integration and API E2E tests cover stage progression, outage catch-up, policy edits, concurrent scans, invalidation and retention.
