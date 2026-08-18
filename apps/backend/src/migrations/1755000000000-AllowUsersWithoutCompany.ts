import { MigrationInterface, QueryRunner } from 'typeorm';

export class AllowUsersWithoutCompany1755000000000 implements MigrationInterface {
  name = 'AllowUsersWithoutCompany1755000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" ALTER COLUMN "companyId" DROP NOT NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE "users" "user"
      SET "companyId" = "membership"."companyId",
          "role" = "membership"."role"
      FROM "memberships" "membership"
      WHERE "user"."companyId" IS NULL
        AND "membership"."id" = (
          SELECT "candidate"."id"
          FROM "memberships" "candidate"
          WHERE "candidate"."userId" = "user"."id"
          ORDER BY ("candidate"."status" = 'active') DESC,
                   "candidate"."createdAt",
                   "candidate"."id"
          LIMIT 1
        )
    `);
    await queryRunner.query(
      `ALTER TABLE "users" ALTER COLUMN "companyId" SET NOT NULL`,
    );
  }
}
