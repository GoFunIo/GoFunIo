# 14 — Broadcast SSE invalidations across instances

**What to build:** Keep an open authenticated frontend fresh through content-free SSE invalidations routed across backend instances, while preserving normal GET requests as the only source of truth.

**Blocked by:** 10 — Reconcile scheduled deadline stages; 11 — Reconcile Notification Recipient access; 12 — Complete Notification inbox interactions

**Status:** resolved

- [x] A short-retained technical change relay stores an opaque change UUID and Workspace/User routing scope without domain content.
- [x] Every committed mutation affecting Alerts, inbox, preferences or counts writes the relay and calls PostgreSQL `NOTIFY` with only its UUID inside the same transaction.
- [x] Each backend instance maintains a PostgreSQL listener, resolves relay scope after commit and wakes only matching local streams.
- [x] `GET /notifications/stream` authenticates with the existing cookie session and Active Workspace and accepts no token or tenant authority from query parameters.
- [x] The stream emits only `notification.changed`, approximately 25-second heartbeats and a server-controlled reconnect hint without Notification business payload.
- [x] Every connection closes after at most 15 minutes, on client disconnect/application shutdown, and when the corresponding Membership loses access.
- [x] `showLiveToasts=false` does not prevent invalidation delivery.
- [x] No replay log or `Last-Event-ID` recovery is implemented; open/reconnect correctness is documented as GET refetch.
- [x] A missed PostgreSQL notification or unavailable listener cannot affect durable inbox or e-mail correctness.
- [x] Unit tests cover routing, heartbeat, maximum lifetime, cleanup and targeted closure.
- [x] PostgreSQL integration tests use separate connections to prove after-commit notification and correct relay lookup.
- [x] HTTP tests cover unauthenticated access and isolation between Users/Workspaces without leaving hanging streams.
