import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateMemberships1753000000000 implements MigrationInterface {
  name = 'CreateMemberships1753000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "memberships" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "userId" uuid NOT NULL,
        "companyId" uuid NOT NULL,
        "role" "user_role" NOT NULL,
        "status" varchar(20) NOT NULL DEFAULT 'active',
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_memberships" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_memberships_user_company" UNIQUE ("userId", "companyId"),
        CONSTRAINT "FK_memberships_user" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_memberships_company" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_memberships_user" ON "memberships" ("userId")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_memberships_company" ON "memberships" ("companyId")
    `);
    await queryRunner.query(`
      INSERT INTO "memberships" ("userId", "companyId", "role", "status", "createdAt", "updatedAt")
      SELECT "id", "companyId", "role", 'active', "createdAt", now()
      FROM "users"
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "memberships"`);
  }
}
