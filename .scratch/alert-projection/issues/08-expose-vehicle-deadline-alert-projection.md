# 08 — Expose Vehicle Deadline Alert projection

**What to build:** Give authenticated Workspace members one backend-owned view of their active Vehicle Deadline Alerts and a separate active Alert count, derived from current Vehicle dates and policy rather than stored Alert rows.

**Blocked by:** 06 — Persist Vehicle Deadline Alert Policy

**Status:** resolved

- [x] No Vehicle Deadline Alert table is introduced; each item is projected from an active Vehicle, an enabled deadline kind and Workspace-local `today`.
- [x] A deadline is active when `daysRemaining <= max(leadDays)` and remains active for every negative overdue value.
- [x] OWNER/ADMIN see all active Workspace Vehicles; MANAGER sees only Vehicles with current Vehicle Access; Driver Allocation grants nothing.
- [x] `GET /vehicle-deadline-alerts` returns stable alert identity, Vehicle display context, kind/date, calendar days remaining and overdue state.
- [x] Results sort by deadline date, Vehicle and kind and support kind, Vehicle and overdue filters.
- [x] Pagination uses an opaque stable cursor with default limit 20 and maximum 100.
- [x] `GET /notification-center/summary` returns separate `activeAlertCount` and, until durable Notifications exist, the correct `unreadNotificationCount` of zero.
- [x] Disabling a kind or reducing the largest lead day changes the projection immediately without mutating Vehicle data.
- [x] API E2E tests cover all kinds, overdue persistence, date boundaries, roles, Vehicle Access, filters, cursors and cross-Workspace masking.
- [x] Query behavior avoids per-Vehicle or per-alert N+1 database access.
- [x] Swagger describes projection, filters, cursor and summary semantics.
