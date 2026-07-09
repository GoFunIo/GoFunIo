import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateCompaniesAndRebuildUsers1746000000000 implements MigrationInterface {
  name = 'CreateCompaniesAndRebuildUsers1746000000000';

  // destructive rebuild — only safe on fresh DB (migration not yet run in prod)
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "pgcrypto"`);

    await queryRunner.query(`DROP TABLE IF EXISTS "users"`);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "user_role" AS ENUM ('ADMIN', 'MANAGER');
      EXCEPTION
        WHEN duplicate_object THEN NULL;
      END $$;
    `);

    await queryRunner.query(`
      CREATE TABLE "companies" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "name" varchar NOT NULL,
        "email" varchar,
        "phone" varchar,
        "taxId" varchar,
        "address" text,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        "deletedAt" TIMESTAMP,
        CONSTRAINT "PK_companies" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "users" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "companyId" uuid NOT NULL,
        "email" varchar NOT NULL,
        "password" varchar NOT NULL,
        "firstName" varchar,
        "lastName" varchar,
        "role" "user_role" NOT NULL,
        "emailVerifiedAt" TIMESTAMP WITH TIME ZONE,
        "lastLoginAt" TIMESTAMP WITH TIME ZONE,
        "verificationTokenHash" varchar,
        "verificationTokenExpiresAt" TIMESTAMP WITH TIME ZONE,
        "passwordVersion" integer NOT NULL DEFAULT 1,
        "passwordResetTokenHash" varchar,
        "passwordResetTokenExpiresAt" TIMESTAMP WITH TIME ZONE,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        "deletedAt" TIMESTAMP,
        CONSTRAINT "PK_users" PRIMARY KEY ("id"),
        CONSTRAINT "FK_users_company" FOREIGN KEY ("companyId") REFERENCES "companies"("id")
      )
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX "IDX_users_email"
      ON "users" ("email")
      WHERE "deletedAt" IS NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_users_email"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "users"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "companies"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "user_role"`);

    await queryRunner.query(`
      CREATE TABLE "users" (
        "id" SERIAL NOT NULL,
        "email" varchar NOT NULL,
        "password" varchar NOT NULL,
        "isVerified" boolean NOT NULL DEFAULT false,
        "verificationTokenHash" varchar,
        "verificationTokenExpiresAt" TIMESTAMP,
        "passwordVersion" integer NOT NULL DEFAULT 1,
        "passwordResetTokenHash" varchar,
        "passwordResetTokenExpiresAt" TIMESTAMP WITH TIME ZONE,
        CONSTRAINT "UQ_users_email" UNIQUE ("email"),
        CONSTRAINT "PK_users" PRIMARY KEY ("id")
      )
    `);
  }
}
