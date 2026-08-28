# Notification Center operations

Notification Center uses the existing Nest `Logger` with one JSON object per
operational event. These logs are diagnostic counters: aggregate by `event`
and, where present, `reason`, `attempts`, `audience`, or `activeConnections`.
No Redis, BullMQ, telemetry framework, or separate worker deployment is part
of this contract.

| Concern | Event |
| --- | --- |
| generation | `notification_generated` |
| dedupe conflict | `notification_deduplicated` |
| durable/SSE invalidation | `notification_source_invalidated`, `notification_invalidation_enqueued` |
| provider acceptance | `notification_delivery_sent` |
| retry | `notification_delivery_retry` |
| permanent failure | `notification_delivery_failed` |
| cancellation | `notification_delivery_cancelled` |
| stale lease recovery | `notification_delivery_lease_recovered` |
| worker cycle failure | `notification_delivery_cycle_failed`, `vehicle_deadline_reconciliation_cycle_failed` |
| SSE connections | `notification_sse_connected`, `notification_sse_disconnected` with `activeConnections` |

Listener startup, reconnect, invalid relay payload, and relay lookup failures
have separate `notification_change_*` events so transport health does not get
confused with durable Notification correctness. A listener outage is not a
delivery or data-loss incident: ordinary GET endpoints and the delivery polling
cycle remain authoritative.

Allowed fields are bounded technical identifiers, enum-like reason/type
values, attempt/count values, and sanitized bounded diagnostics. Do not add
message HTML or text, e-mail addresses, cookies, session/token values,
Notification business snapshots, direct source data, or raw/unbounded provider
responses. A provider message id is persisted for delivery reconciliation but
is intentionally omitted from logs.
