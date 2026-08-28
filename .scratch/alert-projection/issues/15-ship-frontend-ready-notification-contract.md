# 15 — Ship the frontend-ready Notification contract

**What to build:** Finish the backend as one coherent, documented and observable Notification Center contract, prove cross-slice behavior, and hand the frontend team an implementation plan without changing frontend source code.

**Blocked by:** 13 — Deliver optional Notification e-mail reliably; 14 — Broadcast SSE invalidations across instances

**Status:** resolved

- [x] Cross-slice E2E scenarios cover a User with two Memberships/preferences, OWNER/ADMIN/MANAGER access, stage progression, offline recovery, source changes, access removal before send and Workspace switching.
- [x] Migration E2E coverage verifies all tables, indexes, checks, tenant-safe foreign keys, default policy backfill and test-database cleanup registration.
- [x] Multi-instance evidence covers concurrent notification generation, delivery claims and cross-process invalidation without Redis or a separate worker deployment.
- [x] Swagger consistently documents policy, preferences, Alert projection, Notification list/detail/state, summary and SSE contracts.
- [x] Structured logs/counters distinguish generation, dedupe, invalidation, send, retry, permanent failure, cancellation, lease recovery, cycle failure and active SSE connections without sensitive content.
- [x] A frontend integration handoff explains query keys, initial/refetch behavior, one authenticated stream, Workspace switch cleanup, badge semantics, Alert versus Notification sections, filters, read/archive, deep links and `showLiveToasts`.
- [x] The handoff explicitly states that FE must stop deriving the canonical inbox and threshold windows from Vehicle data.
- [x] No frontend implementation, digest, SMS/push, webhook, operator retry UI or future producer is added.
- [x] Full backend build, lint, unit, integration and E2E suites pass from a clean test database.
- [x] A final Standards + Spec review finds no unresolved mismatch with the domain glossary or notification ADRs.
