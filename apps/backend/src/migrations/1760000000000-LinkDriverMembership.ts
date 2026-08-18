import { MigrationInterface, QueryRunner } from 'typeorm';

export class LinkDriverMembership1760000000000 implements MigrationInterface {
  name = 'LinkDriverMembership1760000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "drivers"
      ADD "userId" uuid
    `);
    await queryRunner.query(`
      ALTER TABLE "drivers"
      ADD CONSTRAINT "FK_drivers_membership"
      FOREIGN KEY ("userId", "companyId")
      REFERENCES "memberships"("userId", "companyId")
      ON DELETE RESTRICT
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX "UQ_drivers_active_membership"
      ON "drivers" ("companyId", "userId")
      WHERE "userId" IS NOT NULL AND "deletedAt" IS NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "UQ_drivers_active_membership"`);
    await queryRunner.query(`
      ALTER TABLE "drivers"
      DROP CONSTRAINT "FK_drivers_membership"
    `);
    await queryRunner.query(`ALTER TABLE "drivers" DROP COLUMN "userId"`);
  }
}
