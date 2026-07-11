import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateInitialSchema1748000000000 implements MigrationInterface {
  name = 'CreateInitialSchema1748000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "user_role" AS ENUM ('ADMIN', 'MANAGER')`,
    );
    await queryRunner.query(`
      CREATE TABLE "companies" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "name" varchar NOT NULL,
        "email" varchar,
        "phone" varchar,
        "taxId" varchar,
        "address" text,
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now(),
        "deletedAt" timestamptz,
        CONSTRAINT "PK_companies" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`
      CREATE TABLE "users" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "companyId" uuid NOT NULL,
        "email" varchar NOT NULL,
        "password" varchar,
        "googleId" varchar,
        "firstName" varchar,
        "lastName" varchar,
        "role" "user_role" NOT NULL,
        "emailVerifiedAt" timestamptz,
        "lastLoginAt" timestamptz,
        "verificationTokenHash" varchar,
        "verificationTokenExpiresAt" timestamptz,
        "passwordVersion" integer NOT NULL DEFAULT 1,
        "passwordResetTokenHash" varchar,
        "passwordResetTokenExpiresAt" timestamptz,
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now(),
        "deletedAt" timestamptz,
        CONSTRAINT "PK_users" PRIMARY KEY ("id"),
        CONSTRAINT "FK_users_company" FOREIGN KEY ("companyId")
          REFERENCES "companies"("id") ON DELETE RESTRICT
      )
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX "IDX_users_email"
      ON "users" ("email")
      WHERE "deletedAt" IS NULL
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX "IDX_users_googleId"
      ON "users" ("googleId")
      WHERE "deletedAt" IS NULL AND "googleId" IS NOT NULL
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_users_company"
      ON "users" ("companyId")
      WHERE "deletedAt" IS NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "users"`);
    await queryRunner.query(`DROP TABLE "companies"`);
    await queryRunner.query(`DROP TYPE "user_role"`);
  }
}
