import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddWorkspaceOwner1759000000000 implements MigrationInterface {
  name = 'AddWorkspaceOwner1759000000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TYPE "user_role" RENAME TO "user_role_old"`);
    await queryRunner.query(
      `CREATE TYPE "user_role" AS ENUM ('OWNER', 'ADMIN', 'MANAGER')`,
    );
    await queryRunner.query(
      `ALTER TABLE "memberships" ALTER COLUMN "role" TYPE "user_role" USING "role"::text::"user_role"`,
    );
    await queryRunner.query(`DROP TYPE "user_role_old"`);
    await queryRunner.query(`
      WITH ranked AS (
        SELECT membership.id,
               row_number() OVER (
                 PARTITION BY membership."companyId"
                 ORDER BY CASE WHEN membership.role = 'ADMIN' THEN 0 ELSE 1 END,
                          membership."createdAt",
                          membership.id
               ) AS position
        FROM "memberships" membership
        JOIN "companies" company ON company.id = membership."companyId"
        WHERE membership.status = 'active' AND company."deletedAt" IS NULL
      )
      UPDATE "memberships" membership
      SET role = 'OWNER'
      FROM ranked
      WHERE membership.id = ranked.id AND ranked.position = 1
    `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_memberships_active_owner" ON "memberships" ("companyId") WHERE role = 'OWNER' AND status = 'active'`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_memberships_active_owner"`);
    await queryRunner.query(
      `UPDATE "memberships" SET role = 'ADMIN' WHERE role = 'OWNER'`,
    );
    await queryRunner.query(`ALTER TYPE "user_role" RENAME TO "user_role_old"`);
    await queryRunner.query(
      `CREATE TYPE "user_role" AS ENUM ('ADMIN', 'MANAGER')`,
    );
    await queryRunner.query(
      `ALTER TABLE "memberships" ALTER COLUMN "role" TYPE "user_role" USING "role"::text::"user_role"`,
    );
    await queryRunner.query(`DROP TYPE "user_role_old"`);
  }
}
