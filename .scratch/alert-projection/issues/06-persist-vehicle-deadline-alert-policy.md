# 06 — Persist Vehicle Deadline Alert Policy

**What to build:** Give each Workspace a durable Vehicle Deadline Alert Policy and expose the complete authenticated read/update behavior, including deterministic Workspace calendar semantics required by every later Alert and Notification slice.

**Blocked by:** None — can start immediately

**Status:** resolved

- [x] One policy is persisted per Workspace with enabled deadline kinds, ordered lead days, IANA time zone, activation boundary and audit timestamps.
- [x] Existing Workspaces receive defaults for all three kinds, `[30, 14, 7, 0]`, `Europe/Warsaw` and an activation boundary at rollout; new Workspaces receive equivalent defaults during provisioning.
- [x] `GET /alert-policy` returns the effective policy only for the authenticated Active Workspace and never accepts tenant scope from the client.
- [x] `PATCH /alert-policy` is allowed for OWNER/ADMIN and rejected for MANAGER, with the domain authorization rechecked inside the mutation transaction.
- [x] Enabled kinds are distinct supported values; lead days contain 1–10 distinct integers from `0` through `365` and are returned decreasing; invalid IANA zones are rejected.
- [x] Every accepted policy mutation advances the activation boundary so already crossed thresholds cannot later be interpreted as new work.
- [x] A production Clock and Workspace calendar seam derive local date/time without elapsed-hour or server-time-zone drift.
- [x] Unit tests cover local midnight, 08:00, date-only differences and DST boundaries in more than one time zone.
- [x] Migration and API E2E tests cover defaults, validation, roles and isolation between two Workspaces.
- [x] Swagger documents the policy representation and stable validation failures.
