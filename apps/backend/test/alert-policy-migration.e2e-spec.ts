import { randomBytes } from 'crypto';
import { join } from 'path';
import { DataSource } from 'typeorm';

describe('Vehicle Deadline Alert Policy migration', () => {
  it('backfills existing Workspaces and supports a clean down/up cycle', async () => {
    const schema = `migration_policy_${randomBytes(4).toString('hex')}`;
    const admin = new DataSource({
      type: 'postgres',
      url: process.env.DATABASE_URL,
    });
    const database = new DataSource({
      type: 'postgres',
      url: process.env.DATABASE_URL,
      schema,
      extra: { options: `-c search_path=${schema},public` },
      migrations: [join(__dirname, '../src/migrations', '*.{js,ts}')],
    });

    await admin.initialize();
    try {
      await admin.query(`CREATE SCHEMA "${schema}"`);
      await database.initialize();
      await database.runMigrations();
      await database.undoLastMigration();

      await expect(
        database.query(`SELECT to_regclass($1) AS regclass`, [
          `${schema}.vehicle_deadline_alert_policies`,
        ]),
      ).resolves.toEqual([{ regclass: null }]);

      const companies = await database.query<Array<{ id: string }>>(
        `INSERT INTO "companies" (name)
         VALUES ('Existing first'), ('Existing second')
         RETURNING id`,
      );
      const [{ before }] = await database.query<Array<{ before: Date }>>(
        `SELECT clock_timestamp() AS before`,
      );

      await database.runMigrations();

      const [{ after }] = await database.query<Array<{ after: Date }>>(
        `SELECT clock_timestamp() AS after`,
      );
      const policies = await database.query<
        Array<{
          companyId: string;
          enabledDeadlineKinds: string[];
          leadDays: number[];
          timeZone: string;
          activatedAt: Date;
          createdAt: Date;
          updatedAt: Date;
        }>
      >(
        `SELECT
           "companyId",
           "enabledDeadlineKinds"::text[] AS "enabledDeadlineKinds",
           "leadDays",
           "timeZone",
           "activatedAt",
           "createdAt",
           "updatedAt"
         FROM "vehicle_deadline_alert_policies"
         ORDER BY "companyId"`,
      );

      expect(policies).toHaveLength(2);
      for (const policy of policies) {
        expect(policy).toMatchObject({
          enabledDeadlineKinds: ['OC', 'AC', 'TECHNICAL_INSPECTION'],
          leadDays: [30, 14, 7, 0],
          timeZone: 'Europe/Warsaw',
        });
        expect(policy.activatedAt.getTime()).toBeGreaterThanOrEqual(
          before.getTime(),
        );
        expect(policy.activatedAt.getTime()).toBeLessThanOrEqual(
          after.getTime(),
        );
        expect(policy.createdAt).toBeInstanceOf(Date);
        expect(policy.updatedAt).toBeInstanceOf(Date);
      }

      await expect(
        database.query(
          `INSERT INTO "vehicle_deadline_alert_policies"
           ("companyId", "enabledDeadlineKinds", "leadDays", "timeZone", "activatedAt")
           VALUES ($1, ARRAY['OC']::"vehicle_deadline_kind"[], ARRAY[7]::smallint[], 'Europe/Warsaw', now())`,
          [companies[0].id],
        ),
      ).rejects.toMatchObject({ code: '23505' });

      await expect(
        database.query(
          `UPDATE "vehicle_deadline_alert_policies"
           SET "enabledDeadlineKinds" = ARRAY['OC', 'OC']::"vehicle_deadline_kind"[]
           WHERE "companyId" = $1`,
          [companies[0].id],
        ),
      ).rejects.toMatchObject({ code: '23514' });
      await expect(
        database.query(
          `UPDATE "vehicle_deadline_alert_policies"
           SET "leadDays" = ARRAY[7, 14]::smallint[]
           WHERE "companyId" = $1`,
          [companies[0].id],
        ),
      ).rejects.toMatchObject({ code: '23514' });
      await expect(
        database.query(
          `UPDATE "vehicle_deadline_alert_policies"
           SET "leadDays" = ARRAY[366]::smallint[]
           WHERE "companyId" = $1`,
          [companies[0].id],
        ),
      ).rejects.toMatchObject({ code: '23514' });

      await database.query(`DELETE FROM "companies" WHERE id = $1`, [
        companies[0].id,
      ]);
      await expect(
        database.query<Array<{ companyId: string }>>(
          `SELECT "companyId" FROM "vehicle_deadline_alert_policies"`,
        ),
      ).resolves.toEqual([{ companyId: companies[1].id }]);

      await database.undoLastMigration();
      await expect(
        database.query(`SELECT to_regclass($1) AS regclass`, [
          `${schema}.vehicle_deadline_alert_policies`,
        ]),
      ).resolves.toEqual([{ regclass: null }]);
      await database.runMigrations();
      await expect(
        database.query<Array<{ companyId: string }>>(
          `SELECT "companyId" FROM "vehicle_deadline_alert_policies"`,
        ),
      ).resolves.toEqual([{ companyId: companies[1].id }]);
    } finally {
      if (database.isInitialized) await database.destroy();
      await admin.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
      await admin.destroy();
    }
  });
});
