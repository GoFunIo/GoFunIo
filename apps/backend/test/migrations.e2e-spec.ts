import { randomBytes } from 'crypto';
import { DataSource } from 'typeorm';
import { CreateInitialSchema1748000000000 } from '../src/migrations/1748000000000-CreateInitialSchema';
import { NormalizeUserIdentity1749000000000 } from '../src/migrations/1749000000000-NormalizeUserIdentity';
import { AddProfileFields1750000000000 } from '../src/migrations/1750000000000-AddProfileFields';
import { CreateVehicles1751000000000 } from '../src/migrations/1751000000000-CreateVehicles';

describe('database migrations', () => {
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
        WHERE table_schema = $1 AND table_name IN ('companies', 'users', 'vehicles')
        ORDER BY table_name
      `,
        [schema],
      );
      expect(tables.map(({ table_name }) => table_name)).toEqual([
        'companies',
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
        'IDX_users_company',
        'IDX_users_email',
        'IDX_users_googleId',
        'IDX_users_pendingEmail',
      ]);

      await expect(
        database.query(`
          INSERT INTO "users" ("companyId", "email", "role")
          VALUES ('00000000-0000-0000-0000-000000000000', 'test@example.com', 'ADMIN')
        `),
      ).rejects.toMatchObject({ code: '23503' });

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
        `INSERT INTO "users" ("companyId", "email", "role")
         VALUES ($1, 'other-manager@example.com', 'MANAGER') RETURNING "id"`,
        [otherCompanyId],
      );
      await expect(
        database.query(
          `INSERT INTO "vehicles"
           ("companyId", "managerId", "brand", "model", "registrationNumber")
           VALUES ($1, $2, 'BMW', 'X5', 'CROSS1')`,
          [companyId, otherManagerId],
        ),
      ).rejects.toMatchObject({ code: '23503' });

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
