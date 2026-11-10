import { randomBytes } from 'crypto';
import { readdirSync } from 'fs';
import { join } from 'path';
import { DataSource } from 'typeorm';

const LAST_MIGRATION = 1770000000000;

describe('Custom Vehicle Deadline Kinds migration', () => {
  it('seeds existing Workspaces, keeps built-in Notifications, and supports a clean down/up cycle', async () => {
    const schema = `migration_kinds_${randomBytes(4).toString('hex')}`;
    const directory = join(__dirname, '../src/migrations');
    const migrations = readdirSync(directory)
      .filter(
        (file) =>
          Number(file.split('-')[0]) <= LAST_MIGRATION &&
          /\.(js|ts)$/.test(file),
      )
      .map((file) => join(directory, file));
    const admin = new DataSource({
      type: 'postgres',
      url: process.env.DATABASE_URL,
    });
    const database = new DataSource({
      type: 'postgres',
      url: process.env.DATABASE_URL,
      schema,
      extra: { options: `-c search_path=${schema},public` },
      migrations,
    });

    async function insertNotification(
      companyId: string,
      vehicleId: string,
      deadlineKind: string,
      leadDay: number,
    ): Promise<void> {
      const [{ id }] = await database.query<Array<{ id: string }>>(
        `INSERT INTO notifications ("companyId", type, category, "rendererVersion", "occurredAt")
         VALUES ($1, 'VEHICLE_DEADLINE_REACHED', 'FLEET_DEADLINES', 1, now())
         RETURNING id`,
        [companyId],
      );
      await database.query(
        `INSERT INTO vehicle_deadline_notification_details
           ("notificationId", "companyId", "vehicleId", "deadlineKind", "deadlineDate", "leadDay", "registrationNumberSnapshot")
         VALUES ($1, $2, $3, $4, '2026-09-01', $5, 'MIG0001')`,
        [id, companyId, vehicleId, deadlineKind, leadDay],
      );
    }

    await admin.initialize();
    try {
      await admin.query(`CREATE SCHEMA "${schema}"`);
      await database.initialize();
      await database.runMigrations();
      await database.undoLastMigration();

      const [{ id: companyId }] = await database.query<Array<{ id: string }>>(
        `INSERT INTO companies (name) VALUES ('Existing') RETURNING id`,
      );
      await database.query(
        `INSERT INTO vehicle_deadline_alert_policies
           ("companyId", "enabledDeadlineKinds", "leadDays", "timeZone", "activatedAt")
         VALUES ($1, ARRAY['OC', 'AC']::"vehicle_deadline_kind"[], ARRAY[7]::smallint[], 'Europe/Warsaw', now())`,
        [companyId],
      );
      const [{ id: vehicleId }] = await database.query<Array<{ id: string }>>(
        `INSERT INTO vehicles ("companyId", brand, model, "registrationNumber", "ocExpiry")
         VALUES ($1, 'Toyota', 'Corolla', 'MIG0001', '2026-09-01')
         RETURNING id`,
        [companyId],
      );
      await insertNotification(companyId, vehicleId, 'OC', 7);

      await database.runMigrations();

      const kinds = await database.query<Array<{ id: string; label: string }>>(
        `SELECT id, label FROM vehicle_deadline_custom_kinds ORDER BY label`,
      );
      expect(kinds.map(({ label }) => label)).toEqual([
        'Wymiana oleju',
        'Wymiana świec',
      ]);
      const readPolicy = () =>
        database.query<Array<{ enabledDeadlineKinds: string[] }>>(
          `SELECT "enabledDeadlineKinds"::text[] AS "enabledDeadlineKinds"
             FROM vehicle_deadline_alert_policies`,
        );
      await expect(readPolicy()).resolves.toEqual([
        {
          enabledDeadlineKinds: ['OC', 'AC', kinds[0].id, kinds[1].id],
        },
      ]);

      await database.query(
        `INSERT INTO vehicle_deadline_custom_dates
           ("companyId", "vehicleId", "kindId", "deadlineDate")
         VALUES ($1, $2, $3, '2026-09-01')`,
        [companyId, vehicleId, kinds[0].id],
      );
      await expect(
        database.query(
          `SELECT "deadlineKind", to_char("deadlineDate", 'YYYY-MM-DD') AS date, "deadlineLabel"
             FROM vehicle_deadline_dates ORDER BY "deadlineLabel" NULLS FIRST`,
        ),
      ).resolves.toEqual([
        { deadlineKind: 'OC', date: '2026-09-01', deadlineLabel: null },
        {
          deadlineKind: kinds[0].id,
          date: '2026-09-01',
          deadlineLabel: 'Wymiana oleju',
        },
      ]);
      await insertNotification(companyId, vehicleId, kinds[0].id, 14);
      await expect(
        database.query(
          `UPDATE vehicle_deadline_alert_policies
              SET "enabledDeadlineKinds" = ARRAY['OC', 'OC']::text[]`,
        ),
      ).rejects.toThrow('CHK_vehicle_deadline_alert_policies_kinds');

      await database.undoLastMigration();

      await expect(
        database.query(
          `SELECT "deadlineKind"::text AS kind FROM vehicle_deadline_notification_details`,
        ),
      ).resolves.toEqual([{ kind: 'OC' }]);
      await expect(
        database.query(`SELECT count(*)::int AS count FROM notifications`),
      ).resolves.toEqual([{ count: 1 }]);
      await expect(readPolicy()).resolves.toEqual([
        { enabledDeadlineKinds: ['OC', 'AC'] },
      ]);
      await expect(
        database.query(`SELECT to_regclass($1) AS regclass`, [
          `${schema}.vehicle_deadline_custom_kinds`,
        ]),
      ).resolves.toEqual([{ regclass: null }]);

      await database.runMigrations();
      await expect(
        database.query(
          `SELECT count(*)::int AS count FROM vehicle_deadline_custom_kinds`,
        ),
      ).resolves.toEqual([{ count: 2 }]);
    } finally {
      if (database.isInitialized) await database.destroy();
      await admin.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
      await admin.destroy();
    }
  });
});
