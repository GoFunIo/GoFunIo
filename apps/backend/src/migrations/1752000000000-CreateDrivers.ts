import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateDrivers1752000000000 implements MigrationInterface {
  name = 'CreateDrivers1752000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "drivers" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "companyId" uuid NOT NULL,
        "firstName" varchar(100) NOT NULL,
        "lastName" varchar(100) NOT NULL,
        "email" varchar(254),
        "phone" varchar(50),
        "notes" text,
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now(),
        "deletedAt" timestamptz,
        CONSTRAINT "PK_drivers" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_drivers_id_company" UNIQUE ("id", "companyId"),
        CONSTRAINT "FK_drivers_company" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT,
        CONSTRAINT "CHK_drivers_first_name" CHECK (btrim("firstName") <> ''),
        CONSTRAINT "CHK_drivers_last_name" CHECK (btrim("lastName") <> ''),
        CONSTRAINT "CHK_drivers_notes" CHECK ("notes" IS NULL OR char_length("notes") <= 5000)
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_drivers_company"
      ON "drivers" ("companyId")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_drivers_company_active"
      ON "drivers" ("companyId", "lastName", "firstName", "id")
      WHERE "deletedAt" IS NULL
    `);
    await queryRunner.query(`
      CREATE TABLE "driver_vehicle_assignments" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "companyId" uuid NOT NULL,
        "driverId" uuid NOT NULL,
        "vehicleId" uuid NOT NULL,
        "assignedFrom" timestamptz NOT NULL DEFAULT clock_timestamp(),
        "assignedTo" timestamptz,
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_driver_vehicle_assignments" PRIMARY KEY ("id"),
        CONSTRAINT "FK_driver_assignments_company" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_driver_assignments_driver" FOREIGN KEY ("driverId", "companyId") REFERENCES "drivers"("id", "companyId") ON DELETE RESTRICT,
        CONSTRAINT "FK_driver_assignments_vehicle" FOREIGN KEY ("vehicleId", "companyId") REFERENCES "vehicles"("id", "companyId") ON DELETE RESTRICT,
        CONSTRAINT "CHK_driver_assignments_dates" CHECK ("assignedTo" IS NULL OR "assignedTo" >= "assignedFrom")
      )
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX "IDX_driver_assignments_active_pair"
      ON "driver_vehicle_assignments" ("driverId", "vehicleId")
      WHERE "assignedTo" IS NULL
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_driver_assignments_company_driver"
      ON "driver_vehicle_assignments" ("companyId", "driverId", "assignedTo")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_driver_assignments_company_vehicle"
      ON "driver_vehicle_assignments" ("companyId", "vehicleId", "assignedTo")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "driver_vehicle_assignments"`);
    await queryRunner.query(`DROP TABLE "drivers"`);
  }
}
