import { MigrationInterface, QueryRunner } from 'typeorm';

export class NormalizeUserIdentity1749000000000 implements MigrationInterface {
  name = 'NormalizeUserIdentity1749000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1
          FROM "users"
          GROUP BY lower(btrim("email"))
          HAVING count(*) > 1
        ) THEN
          RAISE EXCEPTION 'Cannot normalize user emails: duplicate canonical emails exist';
        END IF;
      END $$
    `);
    await queryRunner.query(`
      UPDATE "users"
      SET "email" = lower(btrim("email"))
      WHERE "email" <> lower(btrim("email"))
    `);
    await queryRunner.query(`DROP INDEX "IDX_users_email"`);
    await queryRunner.query(`DROP INDEX "IDX_users_googleId"`);
    await queryRunner.query(`
      CREATE UNIQUE INDEX "IDX_users_email" ON "users" (lower("email"))
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX "IDX_users_googleId" ON "users" ("googleId")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_users_email"`);
    await queryRunner.query(`DROP INDEX "IDX_users_googleId"`);
    await queryRunner.query(`
      CREATE UNIQUE INDEX "IDX_users_email"
      ON "users" ("email")
      WHERE "deletedAt" IS NULL
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX "IDX_users_googleId"
      ON "users" ("googleId")
      WHERE "deletedAt" IS NULL AND "googleId" IS NOT NULL
    `);
  }
}
