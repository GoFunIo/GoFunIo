import { MigrationInterface, QueryRunner } from 'typeorm';

export class ReferenceManagerMembership1756000000000 implements MigrationInterface {
  name = 'ReferenceManagerMembership1756000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "manager_vehicle_assignments"
      DROP CONSTRAINT "FK_manager_assignments_manager"
    `);
    await queryRunner.query(`
      ALTER TABLE "manager_vehicle_assignments"
      ADD CONSTRAINT "FK_manager_assignments_manager"
      FOREIGN KEY ("managerId", "companyId")
      REFERENCES "memberships"("userId", "companyId")
      ON DELETE RESTRICT
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "manager_vehicle_assignments"
      DROP CONSTRAINT "FK_manager_assignments_manager"
    `);
    await queryRunner.query(`
      UPDATE "users" user_account
      SET "companyId" = assignment_company."companyId"
      FROM (
        SELECT "managerId", min("companyId"::text)::uuid AS "companyId"
        FROM "manager_vehicle_assignments"
        GROUP BY "managerId"
        HAVING count(DISTINCT "companyId") = 1
      ) assignment_company
      WHERE user_account.id = assignment_company."managerId"
        AND user_account."companyId" IS DISTINCT FROM assignment_company."companyId"
    `);
    await queryRunner.query(`
      ALTER TABLE "manager_vehicle_assignments"
      ADD CONSTRAINT "FK_manager_assignments_manager"
      FOREIGN KEY ("managerId", "companyId")
      REFERENCES "users"("id", "companyId")
      ON DELETE RESTRICT
    `);
  }
}
