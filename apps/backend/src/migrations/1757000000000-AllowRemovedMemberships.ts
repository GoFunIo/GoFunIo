import { MigrationInterface, QueryRunner } from 'typeorm';

export class AllowRemovedMemberships1757000000000 implements MigrationInterface {
  name = 'AllowRemovedMemberships1757000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "memberships" DROP CONSTRAINT "CHK_memberships_status"
    `);
    await queryRunner.query(`
      ALTER TABLE "memberships"
      ADD CONSTRAINT "CHK_memberships_status"
      CHECK ("status" IN ('pending', 'active', 'declined', 'removed'))
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "memberships" DROP CONSTRAINT "CHK_memberships_status"
    `);
    await queryRunner.query(`
      UPDATE "memberships" SET "status" = 'declined' WHERE "status" = 'removed'
    `);
    await queryRunner.query(`
      ALTER TABLE "memberships"
      ADD CONSTRAINT "CHK_memberships_status"
      CHECK ("status" IN ('pending', 'active', 'declined'))
    `);
  }
}
