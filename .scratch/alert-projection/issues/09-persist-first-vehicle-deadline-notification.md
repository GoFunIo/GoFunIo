# 09 — Persist the first Vehicle Deadline Notification

**What to build:** When a Vehicle is created or its deadline changes inside the current reminder window, atomically persist one typed current-stage Notification with authorized Recipients and eligible e-mail Delivery intents, then make that communication readable through minimal inbox endpoints.

**Blocked by:** 06 — Persist Vehicle Deadline Alert Policy; 07 — Persist Membership Notification Preferences; 08 — Expose Vehicle Deadline Alert projection

**Status:** resolved

- [x] A registered Notification Type contract declares category, recipient behavior, e-mail policy, validity, typed detail adapter, DTO renderer and renderer version.
- [x] `VEHICLE_DEADLINE_REACHED` is registered as `FLEET_DEADLINES`, `SOURCE_SCOPED` and `OPTIONAL` e-mail.
- [x] Durable schema covers immutable Notification envelope, typed Vehicle deadline details, shared Notification Recipients and per-recipient/channel Deliveries with tenant-safe foreign keys.
- [x] Typed details preserve deadline kind/date, lead day and minimal registration-number snapshot; no arbitrary JSON, HTML or trusted stored URL is accepted.
- [x] The database enforces uniqueness of `(Workspace, Vehicle, deadline kind, deadline date, lead day)` and one Delivery per Notification Recipient/channel.
- [x] Vehicle create/update after 08:00 local time chooses at most the most urgent crossed current stage and writes Vehicle, Notification, Recipients and Deliveries in one transaction.
- [x] Before 08:00, Vehicle mutation persists no premature stage and leaves time-driven generation to the scheduler.
- [x] OWNER/ADMIN and currently assigned MANAGER recipients are selected according to Vehicle Access; optional Delivery is created only for effective `IMMEDIATE` preference.
- [x] A failed source transaction leaves no partial Notification, Recipient or Delivery; concurrent equivalent writes remain deduplicated.
- [x] Minimal `GET /notifications` and `GET /notifications/:id` return only valid, currently authorized typed data for the caller.
- [x] Deep-link action is computed from current authorization and no tenant scope or direct source URL is trusted from stored content.
- [x] No e-mail network call or SSE emission occurs inside the source transaction.
- [x] Migration, unit, integration and API E2E tests cover atomicity, deduplication, recipient selection, preferences, current-stage catch-up and Workspace isolation.
