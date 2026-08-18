import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateServices1762000000000 implements MigrationInterface {
  name = 'CreateServices1762000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "services" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "companyId" uuid NOT NULL,
        "vehicleId" uuid NOT NULL,
        "serviceDate" date NOT NULL,
        "type" varchar NOT NULL,
        "cost" numeric(12,2) NOT NULL,
        "providerName" varchar(255) NOT NULL,
        "notes" text,
        "attachmentKey" varchar,
        "attachmentName" varchar,
        "attachmentMime" varchar,
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now(),
        "deletedAt" timestamptz,
        CONSTRAINT "PK_services" PRIMARY KEY ("id"),
        CONSTRAINT "FK_services_company" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_services_vehicle" FOREIGN KEY ("vehicleId", "companyId") REFERENCES "vehicles"("id", "companyId") ON DELETE RESTRICT,
        CONSTRAINT "CHK_services_cost" CHECK ("cost" > 0),
        CONSTRAINT "CHK_services_type" CHECK ("type" IN ('FULL', 'OIL_CHANGE', 'TECHNICAL_INSPECTION', 'OC', 'AC', 'OTHER')),
        CONSTRAINT "CHK_services_notes" CHECK ("notes" IS NULL OR char_length("notes") <= 5000)
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_services_company_date_active"
      ON "services" ("companyId", "serviceDate" DESC, "id" DESC)
      WHERE "deletedAt" IS NULL
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_services_company_vehicle_date_active"
      ON "services" ("companyId", "vehicleId", "serviceDate" DESC)
      WHERE "deletedAt" IS NULL
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_services_company_type_active"
      ON "services" ("companyId", "type")
      WHERE "deletedAt" IS NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "services"`);
  }
}
