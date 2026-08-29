# 11 — Reconcile Notification Recipient access

**What to build:** Keep source-scoped Vehicle deadline Recipients and pending Deliveries aligned with current Vehicle Access and Membership lifecycle, including access gained after a stage already exists.

**Blocked by:** 09 — Persist the first Vehicle Deadline Notification

**Status:** resolved

- [x] Assigning Vehicle Access adds a fresh Recipient only for an existing Notification representing the current reminder stage and creates an eligible optional Delivery.
- [x] A newly active or newly authorized OWNER/ADMIN/MANAGER follows the same current-stage-only rule and receives no earlier stages.
- [x] Removing Vehicle Access sets `revokedAt` for affected source-scoped Recipients and cancels every nonterminal Delivery in the same domain transaction.
- [x] Removing/deactivating Membership revokes all of its Workspace recipients, cancels nonterminal Deliveries and prevents future recipient selection.
- [x] Reassigning access never clears revocation or resurrects old inbox history; it creates only a new current-stage Recipient where allowed by uniqueness/lifecycle rules.
- [x] Role changes correctly expand or reduce current Vehicle visibility using domain-owned authorization.
- [x] Driver Allocation alone does not add or preserve any Recipient.
- [x] Notification reads independently re-check active Membership, source validity and current Vehicle Access so stale persisted state cannot authorize data.
- [x] Periodic reconciliation repairs missed access hooks idempotently.
- [x] E2E tests cover access removed after enqueue, Membership removal, role changes, regain, new recipient current stage, two Managers and Workspace isolation.
