import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateVehicles1751000000000 implements MigrationInterface {
  name = 'CreateVehicles1751000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users"
      ADD CONSTRAINT "UQ_users_id_company" UNIQUE ("id", "companyId")
    `);
    await queryRunner.query(`
      CREATE TABLE "vehicles" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "companyId" uuid NOT NULL,
        "brand" varchar(100) NOT NULL,
        "model" varchar(100) NOT NULL,
        "productionYear" smallint,
        "fuelType" varchar(16),
        "vin" varchar(17),
        "registrationNumber" varchar(10) NOT NULL,
        "currentMileage" integer,
        "purchaseDate" date,
        "ocExpiry" date,
        "acExpiry" date,
        "technicalInspectionExpiry" date,
        "notes" text,
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now(),
        "deletedAt" timestamptz,
        CONSTRAINT "PK_vehicles" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_vehicles_id_company" UNIQUE ("id", "companyId"),
        CONSTRAINT "FK_vehicles_company" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT,
        CONSTRAINT "CHK_vehicles_brand" CHECK (btrim("brand") <> ''),
        CONSTRAINT "CHK_vehicles_model" CHECK (btrim("model") <> ''),
        CONSTRAINT "CHK_vehicles_year" CHECK ("productionYear" IS NULL OR "productionYear" >= 1886),
        CONSTRAINT "CHK_vehicles_mileage" CHECK ("currentMileage" IS NULL OR "currentMileage" >= 0),
        CONSTRAINT "CHK_vehicles_notes" CHECK ("notes" IS NULL OR char_length("notes") <= 5000),
        CONSTRAINT "CHK_vehicles_vin" CHECK ("vin" IS NULL OR "vin" ~ '^[A-HJ-NPR-Z0-9]{17}$'),
        CONSTRAINT "CHK_vehicles_registration" CHECK ("registrationNumber" ~ '^[A-Z0-9]{4,10}$'),
        CONSTRAINT "CHK_vehicles_fuel" CHECK ("fuelType" IS NULL OR "fuelType" IN ('DIESEL', 'PETROL', 'LPG', 'HYBRID', 'ELECTRIC'))
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_vehicles_company"
      ON "vehicles" ("companyId")
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX "IDX_vehicles_company_registration_active"
      ON "vehicles" ("companyId", "registrationNumber")
      WHERE "deletedAt" IS NULL
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX "IDX_vehicles_company_vin_active"
      ON "vehicles" ("companyId", "vin")
      WHERE "deletedAt" IS NULL AND "vin" IS NOT NULL
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_vehicles_company_active"
      ON "vehicles" ("companyId", "createdAt" DESC, "id" DESC)
      WHERE "deletedAt" IS NULL
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_vehicles_company_oc_expiry_active"
      ON "vehicles" ("companyId", "ocExpiry")
      WHERE "deletedAt" IS NULL
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_vehicles_company_ac_expiry_active"
      ON "vehicles" ("companyId", "acExpiry")
      WHERE "deletedAt" IS NULL
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_vehicles_company_inspection_expiry_active"
      ON "vehicles" ("companyId", "technicalInspectionExpiry")
      WHERE "deletedAt" IS NULL
    `);
    await queryRunner.query(`
      CREATE TABLE "manager_vehicle_assignments" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "companyId" uuid NOT NULL,
        "managerId" uuid NOT NULL,
        "vehicleId" uuid NOT NULL,
        "assignedFrom" timestamptz NOT NULL DEFAULT clock_timestamp(),
        "assignedTo" timestamptz,
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_manager_vehicle_assignments" PRIMARY KEY ("id"),
        CONSTRAINT "FK_manager_assignments_company" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_manager_assignments_manager" FOREIGN KEY ("managerId", "companyId") REFERENCES "users"("id", "companyId") ON DELETE RESTRICT,
        CONSTRAINT "FK_manager_assignments_vehicle" FOREIGN KEY ("vehicleId", "companyId") REFERENCES "vehicles"("id", "companyId") ON DELETE RESTRICT,
        CONSTRAINT "CHK_manager_assignments_dates" CHECK ("assignedTo" IS NULL OR "assignedTo" >= "assignedFrom")
      )
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX "IDX_manager_assignments_active_pair"
      ON "manager_vehicle_assignments" ("managerId", "vehicleId")
      WHERE "assignedTo" IS NULL
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_manager_assignments_company_manager"
      ON "manager_vehicle_assignments" ("companyId", "managerId", "assignedTo")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_manager_assignments_company_vehicle"
      ON "manager_vehicle_assignments" ("companyId", "vehicleId", "assignedTo")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "manager_vehicle_assignments"`);
    await queryRunner.query(`DROP TABLE "vehicles"`);
    await queryRunner.query(`
      ALTER TABLE "users" DROP CONSTRAINT "UQ_users_id_company"
    `);
  }
}
