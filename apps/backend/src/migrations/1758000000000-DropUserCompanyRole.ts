import { MigrationInterface, QueryRunner } from 'typeorm';

export class DropUserCompanyRole1758000000000 implements MigrationInterface {
  name = 'DropUserCompanyRole1758000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" DROP CONSTRAINT "UQ_users_id_company"`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" DROP CONSTRAINT "FK_users_company"`,
    );
    await queryRunner.query(`DROP INDEX "IDX_users_company"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "companyId"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "role"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1
          FROM "users" user_account
          WHERE NOT EXISTS (
            SELECT 1 FROM "memberships" membership
            WHERE membership."userId" = user_account.id
          )
        ) THEN
          RAISE EXCEPTION 'Cannot restore users.companyId and users.role: users without memberships exist';
        END IF;
      END
      $$
    `);
    await queryRunner.query(`ALTER TABLE "users" ADD COLUMN "companyId" uuid`);
    await queryRunner.query(
      `ALTER TABLE "users" ADD COLUMN "role" "user_role"`,
    );
    await queryRunner.query(`
      WITH selected AS (
        SELECT DISTINCT ON (membership."userId")
               membership."userId", membership."companyId", membership."role"
        FROM "memberships" membership
        ORDER BY membership."userId",
                 (membership.status = 'active') DESC,
                 membership."createdAt",
                 membership.id
      )
      UPDATE "users" user_account
      SET "companyId" = selected."companyId",
          "role" = selected."role"
      FROM selected
      WHERE selected."userId" = user_account.id
    `);
    await queryRunner.query(
      `ALTER TABLE "users" ALTER COLUMN "role" SET NOT NULL`,
    );
    await queryRunner.query(`
      ALTER TABLE "users"
      ADD CONSTRAINT "FK_users_company"
      FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT
    `);
    await queryRunner.query(`
      ALTER TABLE "users"
      ADD CONSTRAINT "UQ_users_id_company" UNIQUE ("id", "companyId")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_users_company"
      ON "users" ("companyId")
      WHERE "deletedAt" IS NULL
    `);
  }
}
