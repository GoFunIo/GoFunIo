# Unwired mail templates

`membership-role-changed.hbs`, `service-entry-registered.hbs` and
`vehicle-access-granted.hbs` are the AutoKeep designs from G1P-143, kept here so
the copy/markup is ready. **Nothing sends them yet.**

Each corresponds to a `NotificationCategory` that exists
(`MEMBERSHIP`, `SERVICE`, `VEHICLE_ACCESS`) but has no `NotificationType`,
detail adapter, event source or delivery wiring. Hooking them up is a separate
ticket: add the `NotificationType`, a `NotificationTypeContract` in
`notifications/notification-types.ts`, a delivery type adapter, and the code
that detects the domain event and writes the notification.

The context variables each template expects are documented in a comment at the
top of the file. `assetBaseUrl` is the frontend origin (for
`/images/...`); `link` and `notificationSettingsUrl` are absolute URLs.
