import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddMembershipInvitations1754000000000 implements MigrationInterface {
  name = 'AddMembershipInvitations1754000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "memberships"
      ADD "tokenHash" varchar,
      ADD "tokenExpiresAt" timestamptz,
      ADD CONSTRAINT "CHK_memberships_status" CHECK ("status" IN ('pending', 'active', 'declined'))
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX "IDX_memberships_token" ON "memberships" ("tokenHash")
      WHERE "tokenHash" IS NOT NULL
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_memberships_user_status" ON "memberships" ("userId", "status")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_memberships_user_status"`);
    await queryRunner.query(`DROP INDEX "IDX_memberships_token"`);
    await queryRunner.query(
      `ALTER TABLE "memberships" DROP CONSTRAINT "CHK_memberships_status", DROP COLUMN "tokenExpiresAt", DROP COLUMN "tokenHash"`,
    );
  }
}
