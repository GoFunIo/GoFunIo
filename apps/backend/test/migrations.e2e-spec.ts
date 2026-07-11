import { randomBytes } from 'crypto';
import { DataSource } from 'typeorm';
import { CreateInitialSchema1748000000000 } from '../src/migrations/1748000000000-CreateInitialSchema';
import { NormalizeUserIdentity1749000000000 } from '../src/migrations/1749000000000-NormalizeUserIdentity';

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
        WHERE table_schema = $1 AND table_name IN ('companies', 'users')
        ORDER BY table_name
      `,
        [schema],
      );
      expect(tables.map(({ table_name }) => table_name)).toEqual([
        'companies',
        'users',
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
      ]);

      await expect(
        database.query(`
          INSERT INTO "users" ("companyId", "email", "role")
          VALUES ('00000000-0000-0000-0000-000000000000', 'test@example.com', 'ADMIN')
        `),
      ).rejects.toMatchObject({ code: '23503' });

      await database.undoLastMigration();
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
            `${schema}.users`,
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
