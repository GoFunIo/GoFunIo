import { randomBytes } from 'crypto';
import { join } from 'path';
import { DataSource } from 'typeorm';

describe('Membership Notification Preferences migration', () => {
  it('enforces tenant-safe membership/category constraints, cascade, and clean down/up', async () => {
    const schema = `migration_preferences_${randomBytes(4).toString('hex')}`;
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
      await database.undoLastMigration();
      await database.undoLastMigration();
      await expect(
        database.query(`SELECT to_regclass($1) AS regclass`, [
          `${schema}.notification_preferences`,
        ]),
      ).resolves.toEqual([{ regclass: null }]);

      await database.runMigrations();
      const [user] = await database.query<Array<{ id: string }>>(
        `INSERT INTO users (email) VALUES ('preference-migration@example.com') RETURNING id`,
      );
      const companies = await database.query<Array<{ id: string }>>(
        `INSERT INTO companies (name) VALUES ('One'), ('Two') RETURNING id`,
      );
      const memberships = await database.query<Array<{ id: string }>>(
        `INSERT INTO memberships ("userId", "companyId", role)
         VALUES ($1, $2, 'OWNER'), ($1, $3, 'OWNER') RETURNING id`,
        [user.id, companies[0].id, companies[1].id],
      );

      await database.query(
        `INSERT INTO notification_preferences
          ("companyId", "membershipId", category, "emailMode", "showLiveToasts")
         VALUES ($1, $2, 'SERVICE', 'OFF', false)`,
        [companies[0].id, memberships[0].id],
      );
      await expect(
        database.query(
          `INSERT INTO notification_preferences
            ("companyId", "membershipId", category, "emailMode", "showLiveToasts")
           VALUES ($1, $2, 'SERVICE', 'IMMEDIATE', true)`,
          [companies[0].id, memberships[0].id],
        ),
      ).rejects.toMatchObject({ code: '23505' });
      await expect(
        database.query(
          `INSERT INTO notification_preferences
            ("companyId", "membershipId", category, "emailMode", "showLiveToasts")
           VALUES ($1, $2, 'PRODUCT', 'OFF', true)`,
          [companies[1].id, memberships[0].id],
        ),
      ).rejects.toMatchObject({ code: '23503' });
      await expect(
        database.query(
          `INSERT INTO notification_preferences
            ("companyId", "membershipId", category, "emailMode", "showLiveToasts")
           VALUES ($1, $2, 'PRODUCT', 'DIGEST', true)`,
          [companies[0].id, memberships[0].id],
        ),
      ).rejects.toBeDefined();
      await expect(
        database.query(
          `INSERT INTO notification_preferences
            ("companyId", "membershipId", category, "emailMode", "showLiveToasts")
           VALUES ($1, $2, 'UNKNOWN', 'OFF', true)`,
          [companies[0].id, memberships[0].id],
        ),
      ).rejects.toBeDefined();

      await database.query(`DELETE FROM memberships WHERE id = $1`, [
        memberships[0].id,
      ]);
      await expect(
        database.query(`SELECT * FROM notification_preferences`),
      ).resolves.toHaveLength(0);

      await database.undoLastMigration();
      await database.undoLastMigration();
      await database.undoLastMigration();
      await database.runMigrations();
      await expect(
        database.query(`SELECT * FROM notification_preferences`),
      ).resolves.toHaveLength(0);
    } finally {
      if (database.isInitialized) await database.destroy();
      await admin.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
      await admin.destroy();
    }
  });
});
