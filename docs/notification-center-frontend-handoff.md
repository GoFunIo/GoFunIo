# Notification Center frontend handoff

The durable HTTP resources are the source of truth. SSE only says that one or
more of them may have changed; it carries no Notification data and has no
replay contract.

## Query model

Use Workspace-scoped TanStack Query keys even though the backend derives the
Workspace from the cookie session:

- `['notification-center', companyId, 'summary']` for
  `GET /notification-center/summary`;
- `['notification-center', companyId, 'policy']` for `GET /alert-policy`;
- `['notification-center', companyId, 'alerts', filters]` for
  `GET /vehicle-deadline-alerts`;
- `['notification-center', companyId, 'notifications', filters]` for
  `GET /notifications`;
- `['notification-center', companyId, 'notification', notificationId]` for
  `GET /notifications/:id`;
- `['notification-center', companyId, 'preferences']` for
  `GET /notification-preferences/me`.

Fetch the policy, effective preferences, summary, and currently visible lists
normally on first render. The durable GET responses are sufficient after any
offline period, even if every SSE event and PostgreSQL `NOTIFY` was missed.
After opening or reopening the stream, refetch active Notification Center queries;
do the same for every `notification.changed` event. Do not infer which record
changed from the event. Heartbeat comments and the `retry: 5000` hint require
no application handling, and `Last-Event-ID` must not be stored or sent.

## Stream lifecycle

Own exactly one `EventSource` in the authenticated dashboard layout, not one
per widget. Connect to `GET /notifications/stream` without query parameters.
For a cross-origin API construct it with `{ withCredentials: true }`; a
same-origin stream sends the cookie normally. Browser reconnects and the
server's 15-minute connection rotation are expected.

Close the old source before switching Workspace. Complete the existing
session Workspace switch, remove or deactivate the old Workspace's queries,
then open one new source under the new session context and refetch. Never
reuse list, detail, summary, or preference data across Workspace keys. A
terminal `401` or `403` should close the source and
enter the existing authentication/access-loss flow.

## UI and mutations

Present one Notification Center with two distinct sections: current Vehicle
Deadline Alerts and chronological Notifications. The header badge uses only
`unreadNotificationCount`; show `activeAlertCount` separately. Preserve the
backend Alert filters (`deadlineKind`, `vehicleId`, `overdue`) and Notification
filters (`category`, `unread`, `archived`). Treat every returned cursor as
opaque, use `limit` from 1 through 100, and discard pagination state when its
Workspace or filters change. Do not recompute deadline windows from Vehicle
data.

After `PATCH /notifications/:id/read`,
`PATCH /notifications/:id/archive`, or `POST /notifications/read-all`, update
or invalidate the matching Notification, list, and summary keys. Details
provide the authorized action descriptor for deep links; do not construct an
action from stale list or Vehicle data. An inbound e-mail link supplies
`workspaceId` and `notificationId`: close the old stream, switch the session to
that Workspace, open the new stream, then fetch `/notifications/:id`. Use the
returned `OPEN_VEHICLE` descriptor's `vehicleId` for navigation; stale or
unauthorized detail is masked as `404`.

`showLiveToasts` controls only optional foreground toast presentation. It must
never disable the EventSource or query invalidation. When it is false, silently
refetch the same resources so lists and counts remain current.

The frontend must stop deriving either the canonical inbox or Alert threshold
windows from Vehicle responses. Vehicle data may still render Vehicle screens,
but Notification Center truth comes only from the policy, Alert, Notification,
summary, and preference endpoints above.
