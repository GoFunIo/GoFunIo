# 07 — Persist Membership Notification Preferences

**What to build:** Let one Membership configure effective notification preferences independently in each Workspace, while returning explicit defaults for every supported category.

**Blocked by:** None — can start immediately

**Status:** resolved

- [x] Preferences are persisted against tenant-scoped Membership identity and Notification Category, never globally against User.
- [x] Supported categories are `FLEET_DEADLINES`, `VEHICLE_ACCESS`, `MEMBERSHIP`, `SERVICE` and `PRODUCT`.
- [x] `emailMode` accepts only `OFF` or `IMMEDIATE`; `showLiveToasts` is independently configurable.
- [x] A missing row resolves to `IMMEDIATE` and `showLiveToasts=true` without requiring eager creation of five rows per Membership.
- [x] `GET /notification-preferences/me` returns all categories with effective values for the current Active Workspace.
- [x] `PATCH /notification-preferences/me` idempotently upserts only the caller's Membership preferences and rejects client-supplied tenant or recipient identity.
- [x] The same User can hold different effective values in two Workspaces without leakage.
- [x] Preference mutation has no historical side effects and establishes no e-mail backlog mechanism.
- [x] Migration and API E2E tests cover defaults, validation, idempotency, removed Membership and Workspace isolation.
- [x] Swagger documents the complete preference collection and enum values.
