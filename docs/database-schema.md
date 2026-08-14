# Database schema

> **Migration convention:** Update this document in every migration that changes a table, column, type, nullability, default, primary/unique/check/foreign-key constraint, index, enum, soft-delete rule, or persisted lifecycle. The schema below is the final state after migration `1762000000000-CreateServices`; migrations are the source of truth.

PostgreSQL identifiers are quoted and therefore case-sensitive. `varchar` without a length means PostgreSQL `character varying` with no declared limit.

## Account-workspace model

`memberships` is the central and only source of an account's workspace (`company`) role and membership state. A user can have one membership per company and memberships in multiple companies. After the CONTRACT migration, `users` has neither `companyId` nor `role`; authorization must not infer workspace access from `users`.

The PostgreSQL enum `user_role` contains `OWNER`, `ADMIN`, and `MANAGER`. It is used by `memberships.role`.

### Invitation lifecycle

- `pending`: an invitation exists. `tokenHash` and `tokenExpiresAt` hold the invitation credential and expiry when token acceptance is used.
- `pending -> active`: accepting an invitation clears `tokenHash` and `tokenExpiresAt`. Only active memberships grant workspace access.
- `pending -> declined`: declining clears `tokenHash` and `tokenExpiresAt`.
- `active -> removed`: removing a member clears invitation token fields and preserves the membership row as history. When a company loses its last active membership, the company is soft-deleted and all of its memberships become `removed`.
- Re-inviting an existing non-active membership reuses its row, sets it to `pending`, assigns the requested role, and replaces its token and expiry. The `(userId, companyId)` unique constraint prevents parallel membership rows for the same account and workspace.

The database check allows `pending`, `active`, `declined`, and `removed`, but does not enforce transitions, token presence/expiry, or that manager assignments reference an active `MANAGER` membership. Those rules are enforced by the application.

## Tables

### `companies`

| Column       | Type           | Null | Default             |
| ------------ | -------------- | ---- | ------------------- |
| `id`         | `uuid`         | no   | `gen_random_uuid()` |
| `name`       | `varchar`      | no   | none                |
| `email`      | `varchar`      | yes  | none                |
| `phone`      | `varchar`      | yes  | none                |
| `taxId`      | `varchar`      | yes  | none                |
| `address`    | `text`         | yes  | none                |
| `postalCode` | `varchar(6)`   | yes  | none                |
| `city`       | `varchar(100)` | yes  | none                |
| `createdAt`  | `timestamptz`  | no   | `now()`             |
| `updatedAt`  | `timestamptz`  | no   | `now()`             |
| `deletedAt`  | `timestamptz`  | yes  | none                |

- Primary key: `PK_companies (id)`.
- Soft delete: `deletedAt IS NULL` denotes a live company.

### `users`

| Column                        | Type           | Null | Default             |
| ----------------------------- | -------------- | ---- | ------------------- |
| `id`                          | `uuid`         | no   | `gen_random_uuid()` |
| `email`                       | `varchar`      | no   | none                |
| `password`                    | `varchar`      | yes  | none                |
| `googleId`                    | `varchar`      | yes  | none                |
| `firstName`                   | `varchar`      | yes  | none                |
| `lastName`                    | `varchar`      | yes  | none                |
| `emailVerifiedAt`             | `timestamptz`  | yes  | none                |
| `lastLoginAt`                 | `timestamptz`  | yes  | none                |
| `verificationTokenHash`       | `varchar`      | yes  | none                |
| `verificationTokenExpiresAt`  | `timestamptz`  | yes  | none                |
| `passwordVersion`             | `integer`      | no   | `1`                 |
| `passwordResetTokenHash`      | `varchar`      | yes  | none                |
| `passwordResetTokenExpiresAt` | `timestamptz`  | yes  | none                |
| `createdAt`                   | `timestamptz`  | no   | `now()`             |
| `updatedAt`                   | `timestamptz`  | no   | `now()`             |
| `deletedAt`                   | `timestamptz`  | yes  | none                |
| `phone`                       | `varchar(32)`  | yes  | none                |
| `address`                     | `varchar(255)` | yes  | none                |
| `postalCode`                  | `varchar(6)`   | yes  | none                |
| `city`                        | `varchar(100)` | yes  | none                |
| `pendingEmail`                | `varchar(254)` | yes  | none                |
| `emailChangeTokenHash`        | `varchar`      | yes  | none                |
| `emailChangeTokenExpiresAt`   | `timestamptz`  | yes  | none                |

- Primary key: `PK_users (id)`.
- Unique indexes: `IDX_users_email` on `lower(email)`; `IDX_users_googleId` on `(googleId)`; `IDX_users_pendingEmail` on `lower(pendingEmail) WHERE pendingEmail IS NOT NULL`. PostgreSQL unique indexes permit multiple `NULL` Google IDs.
- Soft delete: `deletedAt IS NULL` denotes a live user, but email and Google ID uniqueness includes soft-deleted rows.
- `hasPassword` in the entity is a virtual projection, not a stored column.

### `memberships`

| Column           | Type             | Null | Default             |
| ---------------- | ---------------- | ---- | ------------------- |
| `id`             | `uuid`           | no   | `gen_random_uuid()` |
| `userId`         | `uuid`           | no   | none                |
| `companyId`      | `uuid`           | no   | none                |
| `role`           | `user_role` enum | no   | none                |
| `status`         | `varchar(20)`    | no   | `'active'`          |
| `createdAt`      | `timestamptz`    | no   | `now()`             |
| `updatedAt`      | `timestamptz`    | no   | `now()`             |
| `tokenHash`      | `varchar`        | yes  | none                |
| `tokenExpiresAt` | `timestamptz`    | yes  | none                |

- Primary key: `PK_memberships (id)`.
- Unique constraint: `UQ_memberships_user_company (userId, companyId)`. This pair is also the referenced key for manager assignments.
- Check: `CHK_memberships_status`: `status IN ('pending', 'active', 'declined', 'removed')`.
- Foreign keys: `FK_memberships_user (userId) -> users(id) ON DELETE RESTRICT`; `FK_memberships_company (companyId) -> companies(id) ON DELETE RESTRICT`.
- Indexes: `IDX_memberships_user (userId)`; `IDX_memberships_company (companyId)`; `IDX_memberships_user_status (userId, status)`; unique partial `IDX_memberships_token (tokenHash) WHERE tokenHash IS NOT NULL`; unique partial `IDX_memberships_active_owner (companyId) WHERE role = 'OWNER' AND status = 'active'`.
- Memberships are lifecycle rows and are not soft-deleted; `status = 'removed'` preserves removal history.

### `vehicles`

| Column                      | Type           | Null | Default             |
| --------------------------- | -------------- | ---- | ------------------- |
| `id`                        | `uuid`         | no   | `gen_random_uuid()` |
| `companyId`                 | `uuid`         | no   | none                |
| `brand`                     | `varchar(100)` | no   | none                |
| `model`                     | `varchar(100)` | no   | none                |
| `productionYear`            | `smallint`     | yes  | none                |
| `fuelType`                  | `varchar(16)`  | yes  | none                |
| `vin`                       | `varchar(17)`  | yes  | none                |
| `registrationNumber`        | `varchar(10)`  | no   | none                |
| `currentMileage`            | `integer`      | yes  | none                |
| `purchaseDate`              | `date`         | yes  | none                |
| `ocExpiry`                  | `date`         | yes  | none                |
| `acExpiry`                  | `date`         | yes  | none                |
| `technicalInspectionExpiry` | `date`         | yes  | none                |
| `notes`                     | `text`         | yes  | none                |
| `createdAt`                 | `timestamptz`  | no   | `now()`             |
| `updatedAt`                 | `timestamptz`  | no   | `now()`             |
| `deletedAt`                 | `timestamptz`  | yes  | none                |

- Primary key: `PK_vehicles (id)`.
- Unique constraint: `UQ_vehicles_id_company (id, companyId)`, used by tenant-safe composite assignment FKs.
- Foreign key: `FK_vehicles_company (companyId) -> companies(id) ON DELETE RESTRICT`.
- Checks: `CHK_vehicles_brand: btrim(brand) <> ''`; `CHK_vehicles_model: btrim(model) <> ''`; `CHK_vehicles_year: productionYear IS NULL OR productionYear >= 1886`; `CHK_vehicles_mileage: currentMileage IS NULL OR currentMileage >= 0`; `CHK_vehicles_notes: notes IS NULL OR char_length(notes) <= 5000`; `CHK_vehicles_vin: vin IS NULL OR vin ~ '^[A-HJ-NPR-Z0-9]{17}$'`; `CHK_vehicles_registration: registrationNumber ~ '^[A-Z0-9]{4,10}$'`; `CHK_vehicles_fuel: fuelType IS NULL OR fuelType IN ('DIESEL', 'PETROL', 'LPG', 'HYBRID', 'ELECTRIC')`.
- Indexes: `IDX_vehicles_company (companyId)`; unique partial `IDX_vehicles_company_registration_active (companyId, registrationNumber) WHERE deletedAt IS NULL`; unique partial `IDX_vehicles_company_vin_active (companyId, vin) WHERE deletedAt IS NULL AND vin IS NOT NULL`; partial `IDX_vehicles_company_active (companyId, createdAt DESC, id DESC) WHERE deletedAt IS NULL`; partial expiry indexes `IDX_vehicles_company_oc_expiry_active (companyId, ocExpiry)`, `IDX_vehicles_company_ac_expiry_active (companyId, acExpiry)`, and `IDX_vehicles_company_inspection_expiry_active (companyId, technicalInspectionExpiry)`, each `WHERE deletedAt IS NULL`.
- Soft delete: `deletedAt IS NULL` denotes a live vehicle.

### `manager_vehicle_assignments`

| Column         | Type          | Null | Default             |
| -------------- | ------------- | ---- | ------------------- |
| `id`           | `uuid`        | no   | `gen_random_uuid()` |
| `companyId`    | `uuid`        | no   | none                |
| `managerId`    | `uuid`        | no   | none                |
| `vehicleId`    | `uuid`        | no   | none                |
| `assignedFrom` | `timestamptz` | no   | `clock_timestamp()` |
| `assignedTo`   | `timestamptz` | yes  | none                |
| `createdAt`    | `timestamptz` | no   | `now()`             |

- Primary key: `PK_manager_vehicle_assignments (id)`.
- Foreign keys, all `ON DELETE RESTRICT`: `FK_manager_assignments_company (companyId) -> companies(id)`; **`FK_manager_assignments_manager (managerId, companyId) -> memberships(userId, companyId)`**; `FK_manager_assignments_vehicle (vehicleId, companyId) -> vehicles(id, companyId)`. The composite manager FK prevents cross-workspace assignment and requires a membership row, replacing the pre-CONTRACT reference to `users`; role and active status remain application checks.
- Check: `CHK_manager_assignments_dates: assignedTo IS NULL OR assignedTo >= assignedFrom`.
- Indexes: unique partial `IDX_manager_assignments_active_pair (managerId, vehicleId) WHERE assignedTo IS NULL`; `IDX_manager_assignments_company_manager (companyId, managerId, assignedTo)`; `IDX_manager_assignments_company_vehicle (companyId, vehicleId, assignedTo)`.
- Lifecycle: `assignedTo IS NULL` means active. Unassignment, manager membership/role loss, or relevant vehicle removal closes the row with `assignedTo = clock_timestamp()` rather than deleting it. A manager can have only one active row per manager-vehicle pair; history may contain repeated closed assignments.

### `drivers`

| Column      | Type           | Null | Default             |
| ----------- | -------------- | ---- | ------------------- |
| `id`        | `uuid`         | no   | `gen_random_uuid()` |
| `companyId` | `uuid`         | no   | none                |
| `userId`    | `uuid`         | yes  | none                |
| `firstName` | `varchar(100)` | no   | none                |
| `lastName`  | `varchar(100)` | no   | none                |
| `email`     | `varchar(254)` | yes  | none                |
| `phone`     | `varchar(50)`  | yes  | none                |
| `notes`     | `text`         | yes  | none                |
| `createdAt` | `timestamptz`  | no   | `now()`             |
| `updatedAt` | `timestamptz`  | no   | `now()`             |
| `deletedAt` | `timestamptz`  | yes  | none                |

- Primary key: `PK_drivers (id)`.
- Unique constraint: `UQ_drivers_id_company (id, companyId)`, used by the tenant-safe composite assignment FK.
- Foreign keys: `FK_drivers_company (companyId) -> companies(id) ON DELETE RESTRICT`; `FK_drivers_membership (userId, companyId) -> memberships(userId, companyId) ON DELETE RESTRICT`.
- Checks: `CHK_drivers_first_name: btrim(firstName) <> ''`; `CHK_drivers_last_name: btrim(lastName) <> ''`; `CHK_drivers_notes: notes IS NULL OR char_length(notes) <= 5000`.
- Indexes: `IDX_drivers_company (companyId)`; partial `IDX_drivers_company_active (companyId, lastName, firstName, id) WHERE deletedAt IS NULL`; unique partial `UQ_drivers_active_membership (companyId, userId) WHERE userId IS NOT NULL AND deletedAt IS NULL`.
- Soft delete: `deletedAt IS NULL` denotes a live driver.

### `driver_vehicle_assignments`

| Column         | Type          | Null | Default             |
| -------------- | ------------- | ---- | ------------------- |
| `id`           | `uuid`        | no   | `gen_random_uuid()` |
| `companyId`    | `uuid`        | no   | none                |
| `driverId`     | `uuid`        | no   | none                |
| `vehicleId`    | `uuid`        | no   | none                |
| `assignedFrom` | `timestamptz` | no   | `clock_timestamp()` |
| `assignedTo`   | `timestamptz` | yes  | none                |
| `createdAt`    | `timestamptz` | no   | `now()`             |

- Primary key: `PK_driver_vehicle_assignments (id)`.
- Foreign keys, all `ON DELETE RESTRICT`: `FK_driver_assignments_company (companyId) -> companies(id)`; `FK_driver_assignments_driver (driverId, companyId) -> drivers(id, companyId)`; `FK_driver_assignments_vehicle (vehicleId, companyId) -> vehicles(id, companyId)`. Composite FKs prevent cross-workspace assignments.
- Check: `CHK_driver_assignments_dates: assignedTo IS NULL OR assignedTo >= assignedFrom`.
- Indexes: unique partial `IDX_driver_assignments_active_vehicle (vehicleId) WHERE assignedTo IS NULL`; `IDX_driver_assignments_company_driver (companyId, driverId, assignedTo)`; `IDX_driver_assignments_company_vehicle (companyId, vehicleId, assignedTo)`.
- Lifecycle: `assignedTo IS NULL` means active. Unassignment or relevant driver/vehicle removal closes the row with `assignedTo = clock_timestamp()` rather than deleting it. A vehicle can have only one active driver; history may contain repeated closed assignments.

### `services`

| Column           | Type            | Null | Default             |
| ---------------- | --------------- | ---- | ------------------- |
| `id`             | `uuid`          | no   | `gen_random_uuid()` |
| `companyId`      | `uuid`          | no   | none                |
| `vehicleId`      | `uuid`          | no   | none                |
| `serviceDate`    | `date`          | no   | none                |
| `type`           | `varchar`       | no   | none                |
| `cost`           | `numeric(12,2)` | no   | none                |
| `providerName`   | `varchar(255)`  | no   | none                |
| `notes`          | `text`          | yes  | none                |
| `attachmentKey`  | `varchar`       | yes  | none                |
| `attachmentName` | `varchar`       | yes  | none                |
| `attachmentMime` | `varchar`       | yes  | none                |
| `createdAt`      | `timestamptz`   | no   | `now()`             |
| `updatedAt`      | `timestamptz`   | no   | `now()`             |
| `deletedAt`      | `timestamptz`   | yes  | none                |

- Primary key: `PK_services (id)`.
- Foreign keys, both `ON DELETE RESTRICT`: `FK_services_company (companyId) -> companies(id)`; `FK_services_vehicle (vehicleId, companyId) -> vehicles(id, companyId)`. The composite Vehicle foreign key prevents cross-workspace references.
- Checks: `CHK_services_cost: cost > 0`; `CHK_services_type: type IN ('FULL', 'OIL_CHANGE', 'TECHNICAL_INSPECTION', 'OC', 'AC', 'OTHER')`; `CHK_services_notes: notes IS NULL OR char_length(notes) <= 5000`.
- Partial indexes: `IDX_services_company_date_active (companyId, serviceDate DESC, id DESC)`; `IDX_services_company_vehicle_date_active (companyId, vehicleId, serviceDate DESC)`; `IDX_services_company_type_active (companyId, type)`, each `WHERE deletedAt IS NULL`.
- Soft delete: `deletedAt IS NULL` denotes a live service. Direct deletion sets `deletedAt`; Vehicle deletion must soft-delete related Services in the same transaction before Service creation is exposed.
