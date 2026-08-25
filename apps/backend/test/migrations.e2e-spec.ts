import { randomBytes } from 'crypto';
import { DataSource } from 'typeorm';
import { CreateInitialSchema1748000000000 } from '../src/migrations/1748000000000-CreateInitialSchema';
import { NormalizeUserIdentity1749000000000 } from '../src/migrations/1749000000000-NormalizeUserIdentity';
import { AddProfileFields1750000000000 } from '../src/migrations/1750000000000-AddProfileFields';
import { CreateVehicles1751000000000 } from '../src/migrations/1751000000000-CreateVehicles';
import { CreateDrivers1752000000000 } from '../src/migrations/1752000000000-CreateDrivers';
import { CreateMemberships1753000000000 } from '../src/migrations/1753000000000-CreateMemberships';
import { AddMembershipInvitations1754000000000 } from '../src/migrations/1754000000000-AddMembershipInvitations';
import { AllowUsersWithoutCompany1755000000000 } from '../src/migrations/1755000000000-AllowUsersWithoutCompany';
import { ReferenceManagerMembership1756000000000 } from '../src/migrations/1756000000000-ReferenceManagerMembership';
import { AllowRemovedMemberships1757000000000 } from '../src/migrations/1757000000000-AllowRemovedMemberships';
import { DropUserCompanyRole1758000000000 } from '../src/migrations/1758000000000-DropUserCompanyRole';
import { AddWorkspaceOwner1759000000000 } from '../src/migrations/1759000000000-AddWorkspaceOwner';
import { LinkDriverMembership1760000000000 } from '../src/migrations/1760000000000-LinkDriverMembership';
import { CreateServices1762000000000 } from '../src/migrations/1762000000000-CreateServices';
import { NormalizeServiceAttachments1763000000000 } from '../src/migrations/1763000000000-NormalizeServiceAttachments';
import { MembershipRole } from '../src/users/membership-role';

describe('database migrations', () => {
  it('rejects legacy Service attachment metadata before dropping its columns', async () => {
    const schema = `migration_${randomBytes(4).toString('hex')}`;
    const admin = new DataSource({
      type: 'postgres',
      url: process.env.DATABASE_URL,
    });
    const options = {
      type: 'postgres' as const,
      url: process.env.DATABASE_URL,
      schema,
      extra: { options: `-c search_path=${schema},public` },
    };
    const database = new DataSource({
      ...options,
      migrations: [
        CreateInitialSchema1748000000000,
        NormalizeUserIdentity1749000000000,
        AddProfileFields1750000000000,
        CreateVehicles1751000000000,
        CreateDrivers1752000000000,
        CreateMemberships1753000000000,
        AddMembershipInvitations1754000000000,
        AllowUsersWithoutCompany1755000000000,
        ReferenceManagerMembership1756000000000,
        AllowRemovedMemberships1757000000000,
        DropUserCompanyRole1758000000000,
        AddWorkspaceOwner1759000000000,
        LinkDriverMembership1760000000000,
        CreateServices1762000000000,
      ],
    });
    const attachmentMigration = new DataSource({
      ...options,
      migrations: [NormalizeServiceAttachments1763000000000],
    });

    await admin.initialize();
    try {
      await admin.query(`CREATE SCHEMA "${schema}"`);
      await database.initialize();
      await database.runMigrations();

      const [{ id: companyId }] = await database.query<{ id: string }[]>(
        `INSERT INTO "companies" (name) VALUES ('Legacy attachments') RETURNING id`,
      );
      const [{ id: vehicleId }] = await database.query<{ id: string }[]>(
        `INSERT INTO "vehicles" ("companyId", brand, model, "registrationNumber")
         VALUES ($1, 'Legacy', 'Attachment', 'LEGACY1') RETURNING id`,
        [companyId],
      );
      await database.query(
        `INSERT INTO "services"
         ("companyId", "vehicleId", "serviceDate", type, cost, "providerName", "attachmentKey")
         VALUES ($1, $2, '2026-01-15', 'OTHER', '10.00', 'Legacy provider', 'legacy/report.pdf')`,
        [companyId, vehicleId],
      );
      await database.destroy();

      await attachmentMigration.initialize();
      await expect(attachmentMigration.runMigrations()).rejects.toThrow(
        'legacy Service attachment metadata must be null',
      );
      await expect(
        attachmentMigration.query(`SELECT to_regclass($1) AS regclass`, [
          `${schema}.service_attachments`,
        ]),
      ).resolves.toEqual([{ regclass: null }]);
    } finally {
      if (attachmentMigration.isInitialized) {
        await attachmentMigration.destroy();
      }
      if (database.isInitialized) {
        await database.destroy();
      }
      await admin.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
      await admin.destroy();
    }
  });

  it('supports fresh migration, rollback, and rerun', async () => {
    const schema = `migration_${randomBytes(4).toString('hex')}`;
    const admin = new DataSource({
      type: 'postgres',
      url: process.env.DATABASE_URL,
    });
    const database = new DataSource({
      type: 'postgres',
      url: process.env.DATABASE_URL,
      schema,
      extra: { options: `-c search_path=${schema},public` },
      migrations: [
        CreateInitialSchema1748000000000,
        NormalizeUserIdentity1749000000000,
        AddProfileFields1750000000000,
        CreateVehicles1751000000000,
        CreateDrivers1752000000000,
        CreateMemberships1753000000000,
        AddMembershipInvitations1754000000000,
        AllowUsersWithoutCompany1755000000000,
        ReferenceManagerMembership1756000000000,
        AllowRemovedMemberships1757000000000,
        DropUserCompanyRole1758000000000,
        AddWorkspaceOwner1759000000000,
        LinkDriverMembership1760000000000,
        CreateServices1762000000000,
        NormalizeServiceAttachments1763000000000,
      ],
    });

    await admin.initialize();
    try {
      await admin.query(`CREATE SCHEMA "${schema}"`);
      await database.initialize();

      await database.runMigrations();

      const tables = await database.query<{ table_name: string }[]>(
        `
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = $1 AND table_name IN ('companies', 'users', 'vehicles', 'manager_vehicle_assignments', 'drivers', 'driver_vehicle_assignments', 'memberships', 'services', 'service_attachments', 'attachment_object_cleanup')
        ORDER BY table_name
      `,
        [schema],
      );
      expect(tables.map(({ table_name }) => table_name)).toEqual([
        'attachment_object_cleanup',
        'companies',
        'driver_vehicle_assignments',
        'drivers',
        'manager_vehicle_assignments',
        'memberships',
        'service_attachments',
        'services',
        'users',
        'vehicles',
      ]);

      const indexes = await database.query<{ indexname: string }[]>(
        `
        SELECT indexname
        FROM pg_indexes
        WHERE schemaname = $1 AND indexname LIKE 'IDX_users_%'
        ORDER BY indexname
      `,
        [schema],
      );
      expect(indexes.map(({ indexname }) => indexname)).toEqual([
        'IDX_users_email',
        'IDX_users_googleId',
        'IDX_users_pendingEmail',
      ]);

      const contractedColumns = await database.query<{ column_name: string }[]>(
        `SELECT column_name FROM information_schema.columns
         WHERE table_schema = $1 AND table_name = 'users'
           AND column_name IN ('companyId', 'role')`,
        [schema],
      );
      expect(contractedColumns).toEqual([]);

      const legacyAttachmentColumns = await database.query<
        { column_name: string }[]
      >(
        `SELECT column_name FROM information_schema.columns
         WHERE table_schema = $1 AND table_name = 'services'
           AND column_name IN ('attachmentKey', 'attachmentName', 'attachmentMime')`,
        [schema],
      );
      expect(legacyAttachmentColumns).toEqual([]);

      const [{ id: backfillCompanyId }] = await database.query<
        { id: string }[]
      >(
        `INSERT INTO "companies" (name) VALUES ('Owner backfill') RETURNING id`,
      );
      const backfillUsers = await database.query<{ id: string }[]>(
        `INSERT INTO "users" (email)
         VALUES ('owner-backfill-first@example.com'), ('owner-backfill-second@example.com')
         RETURNING id`,
      );
      await database.query(
        `INSERT INTO "memberships" ("userId", "companyId", role, "createdAt")
         VALUES ($1, $3, 'ADMIN', '2026-01-01T00:00:00Z'),
                ($2, $3, 'ADMIN', '2026-01-02T00:00:00Z')`,
        [backfillUsers[0].id, backfillUsers[1].id, backfillCompanyId],
      );

      const [{ id: linkCompanyId }] = await database.query<{ id: string }[]>(
        `INSERT INTO "companies" (name) VALUES ('Driver link') RETURNING id`,
      );
      const [{ id: linkUserId }] = await database.query<{ id: string }[]>(
        `INSERT INTO "users" (email) VALUES ('driver-link@example.com') RETURNING id`,
      );
      await database.query(
        `INSERT INTO "memberships" ("userId", "companyId", role)
         VALUES ($1, $2, 'MANAGER')`,
        [linkUserId, linkCompanyId],
      );
      const [{ id: linkedDriverId }] = await database.query<{ id: string }[]>(
        `INSERT INTO "drivers" ("companyId", "firstName", "lastName", "userId")
         VALUES ($1, 'Linked', 'Driver', $2) RETURNING "id"`,
        [linkCompanyId, linkUserId],
      );
      await expect(
        database.query(
          `INSERT INTO "drivers" ("companyId", "firstName", "lastName", "userId")
           VALUES ($1, 'Duplicate', 'Driver', $2)`,
          [linkCompanyId, linkUserId],
        ),
      ).rejects.toMatchObject({ code: '23505' });
      await expect(
        database.query(
          `INSERT INTO "drivers" ("companyId", "firstName", "lastName", "userId")
           VALUES ($1, 'Cross', 'Driver', $2)`,
          [linkCompanyId, backfillUsers[0].id],
        ),
      ).rejects.toMatchObject({ code: '23503' });
      await database.query(
        `UPDATE "drivers" SET "deletedAt" = now() WHERE "id" = $1`,
        [linkedDriverId],
      );
      const [{ id: replacementDriverId }] = await database.query<
        { id: string }[]
      >(
        `INSERT INTO "drivers" ("companyId", "firstName", "lastName", "userId")
         VALUES ($1, 'Replacement', 'Driver', $2) RETURNING "id"`,
        [linkCompanyId, linkUserId],
      );

      const [{ id: allocationVehicleId }] = await database.query<
        { id: string }[]
      >(
        `INSERT INTO "vehicles" ("companyId", brand, model, "registrationNumber")
         VALUES ($1, 'Migration', 'Allocation', 'MIG100') RETURNING id`,
        [linkCompanyId],
      );
      const [{ id: newerDriverId }] = await database.query<{ id: string }[]>(
        `INSERT INTO "drivers" ("companyId", "firstName", "lastName")
         VALUES ($1, 'Newer', 'Driver') RETURNING id`,
        [linkCompanyId],
      );
      await database.query(
        `INSERT INTO "driver_vehicle_assignments"
         ("companyId", "vehicleId", "driverId", "assignedFrom", "createdAt")
         VALUES ($1, $2, $3, '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z'),
                ($1, $2, $4, '2026-01-02T00:00:00Z', '2026-01-02T00:00:00Z')`,
        [
          linkCompanyId,
          allocationVehicleId,
          replacementDriverId,
          newerDriverId,
        ],
      );
      const activeAllocations = await database.query<{ driverId: string }[]>(
        `SELECT "driverId" FROM "driver_vehicle_assignments"
         WHERE "vehicleId" = $1 AND "assignedTo" IS NULL`,
        [allocationVehicleId],
      );
      expect(activeAllocations).toEqual(
        expect.arrayContaining([
          { driverId: replacementDriverId },
          { driverId: newerDriverId },
        ]),
      );
      expect(activeAllocations).toHaveLength(2);
      await expect(
        database.query(
          `INSERT INTO "driver_vehicle_assignments"
           ("companyId", "vehicleId", "driverId") VALUES ($1, $2, $3)`,
          [linkCompanyId, allocationVehicleId, newerDriverId],
        ),
      ).rejects.toMatchObject({ code: '23505' });

      await database.undoLastMigration();
      await database.undoLastMigration();
      await expect(
        database.query<{ indexname: string }[]>(
          `SELECT indexname FROM pg_indexes
           WHERE schemaname = $1 AND indexname = 'IDX_driver_assignments_active_pair'`,
          [schema],
        ),
      ).resolves.toHaveLength(1);
      await database.undoLastMigration();
      await expect(
        database.query<{ column_name: string }[]>(
          `SELECT column_name FROM information_schema.columns
           WHERE table_schema = $1 AND table_name = 'drivers' AND column_name = 'userId'`,
          [schema],
        ),
      ).resolves.toEqual([]);
      await database.undoLastMigration();
      await database.runMigrations();
      await expect(
        database.query<{ userId: string; role: string }[]>(
          `SELECT "userId", role FROM "memberships" WHERE "companyId" = $1 ORDER BY "createdAt"`,
          [backfillCompanyId],
        ),
      ).resolves.toEqual([
        { userId: backfillUsers[0].id, role: MembershipRole.OWNER },
        { userId: backfillUsers[1].id, role: MembershipRole.ADMIN },
      ]);

      await expect(
        database.query<{ indexname: string }[]>(
          `SELECT indexname FROM pg_indexes WHERE schemaname = $1 AND indexname = 'IDX_memberships_active_owner'`,
          [schema],
        ),
      ).resolves.toHaveLength(1);

      await expect(
        database.query(`
          INSERT INTO "vehicles" ("companyId", "brand", "model", "registrationNumber")
          VALUES ('00000000-0000-0000-0000-000000000000', 'BMW', 'X5', 'TEST123')
        `),
      ).rejects.toMatchObject({ code: '23503' });

      const [{ id: companyId }] = await database.query<{ id: string }[]>(`
        INSERT INTO "companies" ("name") VALUES ('Migration test') RETURNING "id"
      `);
      await expect(
        database.query(
          `INSERT INTO "vehicles"
           ("companyId", "brand", "model", "registrationNumber", "currentMileage")
           VALUES ($1, 'BMW', 'X5', 'TEST123', -1)`,
          [companyId],
        ),
      ).rejects.toMatchObject({ code: '23514' });

      const [{ id: otherCompanyId }] = await database.query<{ id: string }[]>(`
        INSERT INTO "companies" ("name") VALUES ('Other company') RETURNING "id"
      `);
      const [{ id: otherManagerId }] = await database.query<{ id: string }[]>(
        `INSERT INTO "users" ("email")
         VALUES ('other-manager@example.com') RETURNING "id"`,
      );
      await database.query(
        `INSERT INTO "memberships" ("userId", "companyId", "role")
         VALUES ($1, $2, 'MANAGER')`,
        [otherManagerId, otherCompanyId],
      );
      const [{ id: vehicleId }] = await database.query<{ id: string }[]>(
        `INSERT INTO "vehicles" ("companyId", "brand", "model", "registrationNumber")
         VALUES ($1, 'BMW', 'X5', 'CROSS1') RETURNING "id"`,
        [companyId],
      );

      const [{ id: serviceId }] = await database.query<{ id: string }[]>(
        `INSERT INTO "services"
         ("companyId", "vehicleId", "serviceDate", "type", "cost", "providerName", "notes")
         VALUES ($1, $2, '2026-01-15', 'FULL', '1234.56', 'Migration Workshop', 'Complete service')
         RETURNING id`,
        [companyId, vehicleId],
      );
      await expect(
        database.query(
          `INSERT INTO "services"
           ("companyId", "vehicleId", "serviceDate", "type", "cost", "providerName")
           VALUES ($1, $2, '2026-01-15', 'OTHER', '10.00', 'Cross-workspace')`,
          [otherCompanyId, vehicleId],
        ),
      ).rejects.toMatchObject({ code: '23503' });
      for (const cost of ['0', '-0.01']) {
        await expect(
          database.query(
            `INSERT INTO "services"
             ("companyId", "vehicleId", "serviceDate", "type", "cost", "providerName")
             VALUES ($1, $2, '2026-01-15', 'OIL_CHANGE', $3, 'Invalid cost')`,
            [companyId, vehicleId, cost],
          ),
        ).rejects.toMatchObject({ code: '23514' });
      }
      await expect(
        database.query(
          `INSERT INTO "services"
           ("companyId", "vehicleId", "serviceDate", "type", "cost", "providerName")
           VALUES ($1, $2, '2026-01-15', 'UNKNOWN', '10.00', 'Invalid type')`,
          [companyId, vehicleId],
        ),
      ).rejects.toMatchObject({ code: '23514' });
      await expect(
        database.query(
          `INSERT INTO "services"
           ("companyId", "vehicleId", "serviceDate", "type", "cost", "providerName", "notes")
           VALUES ($1, $2, '2026-01-15', 'OC', '10.00', 'Long notes', $3)`,
          [companyId, vehicleId, 'x'.repeat(5001)],
        ),
      ).rejects.toMatchObject({ code: '23514' });

      await database.query(
        `INSERT INTO "service_attachments"
         ("companyId", "serviceId", "objectKey", name, "mimeType", size)
         VALUES ($1, $2, 'service-attachments/valid.pdf', 'valid.pdf', 'application/pdf', 1024)`,
        [companyId, serviceId],
      );
      await expect(
        database.query(
          `INSERT INTO "service_attachments"
           ("companyId", "serviceId", "objectKey", name, "mimeType", size)
           VALUES ($1, $2, 'service-attachments/cross.pdf', 'cross.pdf', 'application/pdf', 1024)`,
          [otherCompanyId, serviceId],
        ),
      ).rejects.toMatchObject({ code: '23503' });
      for (const [objectKey, size] of [
        ['service-attachments/empty.pdf', 0],
        ['service-attachments/large.pdf', 10_485_761],
      ] as const) {
        await expect(
          database.query(
            `INSERT INTO "service_attachments"
             ("companyId", "serviceId", "objectKey", name, "mimeType", size)
             VALUES ($1, $2, $3, 'invalid.pdf', 'application/pdf', $4)`,
            [companyId, serviceId, objectKey, size],
          ),
        ).rejects.toMatchObject({ code: '23514' });
      }
      await expect(
        database.query(
          `INSERT INTO "service_attachments"
           ("companyId", "serviceId", "objectKey", name, "mimeType", size)
           VALUES ($1, $2, 'service-attachments/text.txt', 'text.txt', 'text/plain', 10)`,
          [companyId, serviceId],
        ),
      ).rejects.toMatchObject({ code: '23514' });
      await expect(
        database.query(
          `INSERT INTO "service_attachments"
           ("companyId", "serviceId", "objectKey", name, "mimeType", size)
           VALUES ($1, $2, 'service-attachments/valid.pdf', 'duplicate.pdf', 'application/pdf', 10)`,
          [companyId, serviceId],
        ),
      ).rejects.toMatchObject({ code: '23505' });
      await expect(
        database.query(
          `INSERT INTO "attachment_object_cleanup"
           ("objectKey", "deleteAfter", attempts, "nextAttemptAt")
           VALUES ('service-attachments/cleanup.pdf', now(), -1, now())`,
        ),
      ).rejects.toMatchObject({ code: '23514' });

      const attachmentIndexes = await database.query<
        { indexname: string; indexdef: string }[]
      >(
        `SELECT indexname, indexdef FROM pg_indexes
         WHERE schemaname = $1
           AND indexname IN ('IDX_service_attachments_company_service_active', 'IDX_attachment_object_cleanup_due')
         ORDER BY indexname`,
        [schema],
      );
      expect(attachmentIndexes).toEqual([
        {
          indexname: 'IDX_attachment_object_cleanup_due',
          indexdef: expect.stringContaining(
            '("nextAttemptAt", "lockedAt") WHERE ("completedAt" IS NULL)',
          ),
        },
        {
          indexname: 'IDX_service_attachments_company_service_active',
          indexdef: expect.stringContaining(
            '("companyId", "serviceId", "createdAt" DESC, id DESC) WHERE ("deletedAt" IS NULL)',
          ),
        },
      ]);

      const serviceIndexes = await database.query<
        { indexname: string; indexdef: string }[]
      >(
        `SELECT indexname, indexdef FROM pg_indexes
         WHERE schemaname = $1 AND indexname LIKE 'IDX_services_%'
         ORDER BY indexname`,
        [schema],
      );
      expect(serviceIndexes).toEqual([
        {
          indexname: 'IDX_services_company_date_active',
          indexdef: expect.stringContaining(
            '("companyId", "serviceDate" DESC, id DESC) WHERE ("deletedAt" IS NULL)',
          ),
        },
        {
          indexname: 'IDX_services_company_type_active',
          indexdef: expect.stringContaining(
            '("companyId", type) WHERE ("deletedAt" IS NULL)',
          ),
        },
        {
          indexname: 'IDX_services_company_vehicle_date_active',
          indexdef: expect.stringContaining(
            '("companyId", "vehicleId", "serviceDate" DESC) WHERE ("deletedAt" IS NULL)',
          ),
        },
      ]);

      await database.undoLastMigration();
      await expect(
        database.query(`SELECT to_regclass($1) AS regclass`, [
          `${schema}.service_attachments`,
        ]),
      ).resolves.toEqual([{ regclass: null }]);
      await expect(
        database.query<{ column_name: string }[]>(
          `SELECT column_name FROM information_schema.columns
           WHERE table_schema = $1 AND table_name = 'services'
             AND column_name IN ('attachmentKey', 'attachmentName', 'attachmentMime')
           ORDER BY column_name`,
          [schema],
        ),
      ).resolves.toEqual([
        { column_name: 'attachmentKey' },
        { column_name: 'attachmentMime' },
        { column_name: 'attachmentName' },
      ]);
      await database.runMigrations();
      await expect(
        database.query(`SELECT to_regclass($1) AS regclass`, [
          `${schema}.service_attachments`,
        ]),
      ).resolves.toEqual([{ regclass: 'service_attachments' }]);

      await database.undoLastMigration();
      await database.undoLastMigration();
      await expect(
        database.query(`SELECT to_regclass($1) AS regclass`, [
          `${schema}.services`,
        ]),
      ).resolves.toEqual([{ regclass: null }]);
      await database.runMigrations();
      await expect(
        database.query(`SELECT to_regclass($1) AS regclass`, [
          `${schema}.services`,
        ]),
      ).resolves.toEqual([{ regclass: 'services' }]);

      await expect(
        database.query(
          `INSERT INTO "manager_vehicle_assignments"
           ("companyId", "managerId", "vehicleId")
           VALUES ($1, $2, $3)`,
          [companyId, otherManagerId, vehicleId],
        ),
      ).rejects.toMatchObject({ code: '23503' });

      const [{ id: managerId }] = await database.query<{ id: string }[]>(
        `INSERT INTO "users" ("email")
         VALUES ('local-manager@example.com') RETURNING "id"`,
      );
      await expect(
        database.query(
          `INSERT INTO "manager_vehicle_assignments" ("companyId", "managerId", "vehicleId")
           VALUES ($1, $2, $3)`,
          [companyId, managerId, vehicleId],
        ),
      ).rejects.toMatchObject({ code: '23503' });
      await database.query(
        `INSERT INTO "memberships" ("userId", "companyId", "role")
         VALUES ($1, $2, 'MANAGER')`,
        [managerId, companyId],
      );
      await database.query(
        `UPDATE "memberships" SET role = 'OWNER' WHERE "userId" = $1 AND "companyId" = $2`,
        [managerId, companyId],
      );
      await expect(
        database.query(
          `INSERT INTO "memberships" ("userId", "companyId", role)
           VALUES ($1, $2, 'OWNER')`,
          [otherManagerId, companyId],
        ),
      ).rejects.toMatchObject({ code: '23505' });
      await database.query(
        `UPDATE "memberships" SET role = 'MANAGER' WHERE "userId" = $1 AND "companyId" = $2`,
        [managerId, companyId],
      );
      await expect(
        database.query(
          `INSERT INTO "manager_vehicle_assignments"
           ("companyId", "managerId", "vehicleId", "assignedFrom", "assignedTo")
           VALUES ($1, $2, $3, '2026-01-02T00:00:00Z', '2026-01-01T00:00:00Z')`,
          [companyId, managerId, vehicleId],
        ),
      ).rejects.toMatchObject({ code: '23514' });
      await database.query(
        `INSERT INTO "manager_vehicle_assignments" ("companyId", "managerId", "vehicleId")
         VALUES ($1, $2, $3)`,
        [companyId, managerId, vehicleId],
      );
      await expect(
        database.query(
          `INSERT INTO "manager_vehicle_assignments" ("companyId", "managerId", "vehicleId")
           VALUES ($1, $2, $3)`,
          [companyId, managerId, vehicleId],
        ),
      ).rejects.toMatchObject({ code: '23505' });

      const [{ id: driverId }] = await database.query<{ id: string }[]>(
        `INSERT INTO "drivers" ("companyId", "firstName", "lastName")
         VALUES ($1, 'Local', 'Driver') RETURNING "id"`,
        [companyId],
      );
      const [{ id: otherDriverId }] = await database.query<{ id: string }[]>(
        `INSERT INTO "drivers" ("companyId", "firstName", "lastName")
         VALUES ($1, 'Other', 'Driver') RETURNING "id"`,
        [otherCompanyId],
      );
      await expect(
        database.query(
          `INSERT INTO "driver_vehicle_assignments" ("companyId", "driverId", "vehicleId")
           VALUES ($1, $2, $3)`,
          [companyId, otherDriverId, vehicleId],
        ),
      ).rejects.toMatchObject({ code: '23503' });
      await expect(
        database.query(
          `INSERT INTO "driver_vehicle_assignments"
           ("companyId", "driverId", "vehicleId", "assignedFrom", "assignedTo")
           VALUES ($1, $2, $3, '2026-01-02T00:00:00Z', '2026-01-01T00:00:00Z')`,
          [companyId, driverId, vehicleId],
        ),
      ).rejects.toMatchObject({ code: '23514' });
      await database.query(
        `INSERT INTO "driver_vehicle_assignments" ("companyId", "driverId", "vehicleId")
         VALUES ($1, $2, $3)`,
        [companyId, driverId, vehicleId],
      );
      await expect(
        database.query(
          `INSERT INTO "driver_vehicle_assignments" ("companyId", "driverId", "vehicleId")
           VALUES ($1, $2, $3)`,
          [companyId, driverId, vehicleId],
        ),
      ).rejects.toMatchObject({ code: '23505' });

      const [{ id: invitedUserId }] = await database.query<{ id: string }[]>(
        `INSERT INTO "users" ("email")
          VALUES ('migration-invitee@example.com') RETURNING "id"`,
      );
      await database.query(
        `INSERT INTO "memberships" ("userId", "companyId", "role", "status")
         VALUES ($1, $2, 'MANAGER', 'pending')`,
        [invitedUserId, companyId],
      );
      await database.query(
        `INSERT INTO "manager_vehicle_assignments" ("companyId", "managerId", "vehicleId")
         VALUES ($1, $2, $3)`,
        [companyId, invitedUserId, vehicleId],
      );
      await database.query(
        `UPDATE "memberships" SET "status" = 'removed' WHERE "userId" = $1`,
        [invitedUserId],
      );
      await expect(
        database.query(
          `UPDATE "memberships" SET "status" = 'unknown' WHERE "userId" = $1`,
          [invitedUserId],
        ),
      ).rejects.toMatchObject({ code: '23514' });

      const [{ id: membershiplessUserId }] = await database.query<
        { id: string }[]
      >(
        `INSERT INTO "users" ("email") VALUES ('membershipless@example.com') RETURNING id`,
      );
      await database.undoLastMigration();
      await database.undoLastMigration();
      await database.undoLastMigration();
      await database.undoLastMigration();
      await expect(database.undoLastMigration()).rejects.toThrow(
        'users without memberships exist',
      );
      await database.query(`DELETE FROM "users" WHERE id = $1`, [
        membershiplessUserId,
      ]);

      await database.query(
        `INSERT INTO "memberships" ("userId", "companyId", "role", "status", "createdAt")
         VALUES ($1, $2, 'ADMIN', 'active', now() + interval '1 day')`,
        [invitedUserId, otherCompanyId],
      );
      await database.undoLastMigration();
      await expect(
        database.query<Array<{ companyId: string; role: string }>>(
          `SELECT "companyId", role FROM "users" WHERE id = $1`,
          [invitedUserId],
        ),
      ).resolves.toEqual([
        { companyId: otherCompanyId, role: MembershipRole.ADMIN },
      ]);
      const restoredDependencies = await database.query<
        Array<{ constraint_name: string }>
      >(
        `SELECT constraint_name FROM information_schema.table_constraints
         WHERE table_schema = $1 AND table_name = 'users'
           AND constraint_name IN ('FK_users_company', 'UQ_users_id_company')
         ORDER BY constraint_name`,
        [schema],
      );
      expect(
        restoredDependencies.map(({ constraint_name }) => constraint_name),
      ).toEqual(['FK_users_company', 'UQ_users_id_company']);
      await expect(
        database.query<{ indexname: string }[]>(
          `SELECT indexname FROM pg_indexes WHERE schemaname = $1 AND indexname = 'IDX_users_company'`,
          [schema],
        ),
      ).resolves.toHaveLength(1);

      await database.undoLastMigration();
      await expect(
        database.query<{ status: string }[]>(
          `SELECT "status" FROM "memberships" WHERE "userId" = $1`,
          [invitedUserId],
        ),
      ).resolves.toEqual(
        expect.arrayContaining([{ status: 'active' }, { status: 'declined' }]),
      );
      await database.undoLastMigration();
      await expect(
        database.query<{ id: string }[]>(
          `SELECT "id" FROM "manager_vehicle_assignments" WHERE "managerId" = $1`,
          [invitedUserId],
        ),
      ).resolves.toHaveLength(1);
      await database.undoLastMigration();
      const [restoredCompanyIdColumn] = await database.query<
        Array<{ is_nullable: string }>
      >(
        `SELECT is_nullable FROM information_schema.columns WHERE table_schema = $1 AND table_name = 'users' AND column_name = 'companyId'`,
        [schema],
      );
      expect(restoredCompanyIdColumn.is_nullable).toBe('NO');
      await expect(
        database.query<Array<{ companyId: string }>>(
          `SELECT "companyId" FROM "users" WHERE "id" = $1`,
          [invitedUserId],
        ),
      ).resolves.toEqual([{ companyId }]);

      await database.undoLastMigration();
      const invitationColumns = await database.query<{ column_name: string }[]>(
        `SELECT column_name FROM information_schema.columns WHERE table_schema = $1 AND table_name = 'memberships' AND column_name IN ('tokenHash', 'tokenExpiresAt')`,
        [schema],
      );
      expect(invitationColumns).toEqual([]);
      expect(
        (
          await database.query(`SELECT to_regclass($1) AS regclass`, [
            `${schema}.memberships`,
          ])
        )[0].regclass,
      ).not.toBeNull();

      await database.undoLastMigration();
      expect(
        (
          await database.query(`SELECT to_regclass($1) AS regclass`, [
            `${schema}.memberships`,
          ])
        )[0].regclass,
      ).toBeNull();
      expect(
        (
          await database.query(`SELECT to_regclass($1) AS regclass`, [
            `${schema}.drivers`,
          ])
        )[0].regclass,
      ).not.toBeNull();

      await database.undoLastMigration();
      expect(
        (
          await database.query(`SELECT to_regclass($1) AS regclass`, [
            `${schema}.drivers`,
          ])
        )[0].regclass,
      ).toBeNull();
      expect(
        (
          await database.query(`SELECT to_regclass($1) AS regclass`, [
            `${schema}.vehicles`,
          ])
        )[0].regclass,
      ).not.toBeNull();

      await database.undoLastMigration();
      expect(
        (
          await database.query(`SELECT to_regclass($1) AS regclass`, [
            `${schema}.vehicles`,
          ])
        )[0].regclass,
      ).toBeNull();
      expect(
        (
          await database.query(`SELECT to_regclass($1) AS regclass`, [
            `${schema}.users`,
          ])
        )[0].regclass,
      ).not.toBeNull();

      await database.runMigrations();
      expect(
        (
          await database.query(`SELECT to_regclass($1) AS regclass`, [
            `${schema}.vehicles`,
          ])
        )[0].regclass,
      ).not.toBeNull();
    } finally {
      if (database.isInitialized) {
        await database.destroy();
      }
      await admin.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
      await admin.destroy();
    }
  });
});
