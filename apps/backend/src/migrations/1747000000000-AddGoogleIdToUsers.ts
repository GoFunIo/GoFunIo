import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddGoogleIdToUsers1747000000000 implements MigrationInterface {
  name = 'AddGoogleIdToUsers1747000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users"
      ADD COLUMN "googleId" varchar
    `);

    await queryRunner.query(`
      ALTER TABLE "users"
      ALTER COLUMN "password" DROP NOT NULL
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX "IDX_users_googleId"
      ON "users" ("googleId")
      WHERE "deletedAt" IS NULL AND "googleId" IS NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_users_googleId"`);
    // ponytail: rollback preserves OAuth rows with an unusable password; users must reset it after downgrade
    await queryRunner.query(`
      UPDATE "users"
      SET "password" = 'oauth-only.invalid'
      WHERE "password" IS NULL
    `);
    await queryRunner.query(`
      ALTER TABLE "users"
      ALTER COLUMN "password" SET NOT NULL
    `);
    await queryRunner.query(`
      ALTER TABLE "users"
      DROP COLUMN "googleId"
    `);
  }
}
