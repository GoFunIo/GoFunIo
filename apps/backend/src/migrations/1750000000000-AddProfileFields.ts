import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddProfileFields1750000000000 implements MigrationInterface {
  name = 'AddProfileFields1750000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users"
      ADD COLUMN "phone" varchar(32),
      ADD COLUMN "address" varchar(255),
      ADD COLUMN "postalCode" varchar(6),
      ADD COLUMN "city" varchar(100),
      ADD COLUMN "pendingEmail" varchar(254),
      ADD COLUMN "emailChangeTokenHash" varchar,
      ADD COLUMN "emailChangeTokenExpiresAt" timestamptz
    `);
    await queryRunner.query(`
      ALTER TABLE "companies"
      ADD COLUMN "postalCode" varchar(6),
      ADD COLUMN "city" varchar(100)
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX "IDX_users_pendingEmail"
      ON "users" (lower("pendingEmail"))
      WHERE "pendingEmail" IS NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_users_pendingEmail"`);
    await queryRunner.query(`
      ALTER TABLE "companies"
      DROP COLUMN "city",
      DROP COLUMN "postalCode"
    `);
    await queryRunner.query(`
      ALTER TABLE "users"
      DROP COLUMN "emailChangeTokenExpiresAt",
      DROP COLUMN "emailChangeTokenHash",
      DROP COLUMN "pendingEmail",
      DROP COLUMN "city",
      DROP COLUMN "postalCode",
      DROP COLUMN "address",
      DROP COLUMN "phone"
    `);
  }
}
