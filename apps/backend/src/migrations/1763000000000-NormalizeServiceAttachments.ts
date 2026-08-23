import { MigrationInterface, QueryRunner } from 'typeorm';

export class NormalizeServiceAttachments1763000000000 implements MigrationInterface {
  name = 'NormalizeServiceAttachments1763000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "services"
      ADD CONSTRAINT "UQ_services_id_company" UNIQUE ("id", "companyId")
    `);
    await queryRunner.query(`
      CREATE TABLE "service_attachments" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "companyId" uuid NOT NULL,
        "serviceId" uuid NOT NULL,
        "objectKey" varchar NOT NULL,
        "name" varchar(255) NOT NULL,
        "mimeType" varchar NOT NULL,
        "size" integer NOT NULL,
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now(),
        "deletedAt" timestamptz,
        CONSTRAINT "PK_service_attachments" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_service_attachments_object_key" UNIQUE ("objectKey"),
        CONSTRAINT "FK_service_attachments_service" FOREIGN KEY ("serviceId", "companyId") REFERENCES "services"("id", "companyId") ON DELETE RESTRICT,
        CONSTRAINT "CHK_service_attachments_size" CHECK ("size" BETWEEN 1 AND 10485760),
        CONSTRAINT "CHK_service_attachments_mime" CHECK ("mimeType" IN ('application/pdf', 'image/jpeg', 'image/png'))
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_service_attachments_company_service_active"
      ON "service_attachments" ("companyId", "serviceId", "createdAt" DESC, "id" DESC)
      WHERE "deletedAt" IS NULL
    `);
    await queryRunner.query(`
      CREATE TABLE "attachment_object_cleanup" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "objectKey" varchar NOT NULL,
        "deleteAfter" timestamptz NOT NULL,
        "attempts" integer NOT NULL DEFAULT 0,
        "nextAttemptAt" timestamptz NOT NULL,
        "lockedAt" timestamptz,
        "lastError" text,
        "completedAt" timestamptz,
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_attachment_object_cleanup" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_attachment_object_cleanup_object_key" UNIQUE ("objectKey"),
        CONSTRAINT "CHK_attachment_object_cleanup_attempts" CHECK ("attempts" >= 0)
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_attachment_object_cleanup_due"
      ON "attachment_object_cleanup" ("nextAttemptAt", "lockedAt")
      WHERE "completedAt" IS NULL
    `);
    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1
          FROM "services"
          WHERE "attachmentKey" IS NOT NULL
             OR "attachmentName" IS NOT NULL
             OR "attachmentMime" IS NOT NULL
        ) THEN
          RAISE EXCEPTION 'legacy Service attachment metadata must be null before normalizing Service Attachments';
        END IF;
      END
      $$
    `);
    await queryRunner.query(`
      ALTER TABLE "services"
      DROP COLUMN "attachmentKey",
      DROP COLUMN "attachmentName",
      DROP COLUMN "attachmentMime"
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "services"
      ADD COLUMN "attachmentKey" varchar,
      ADD COLUMN "attachmentName" varchar,
      ADD COLUMN "attachmentMime" varchar
    `);
    await queryRunner.query(`DROP TABLE "attachment_object_cleanup"`);
    await queryRunner.query(`DROP TABLE "service_attachments"`);
    await queryRunner.query(`
      ALTER TABLE "services" DROP CONSTRAINT "UQ_services_id_company"
    `);
  }
}
