import { MigrationInterface, QueryRunner } from 'typeorm';

export class EnforceSingleActiveDriver1761000000000 implements MigrationInterface {
  name = 'EnforceSingleActiveDriver1761000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      WITH ranked AS (
        SELECT id,
               row_number() OVER (
                 PARTITION BY "vehicleId"
                 ORDER BY "assignedFrom" DESC, "createdAt" DESC, id DESC
               ) AS position
        FROM "driver_vehicle_assignments"
        WHERE "assignedTo" IS NULL
      )
      UPDATE "driver_vehicle_assignments" assignment
      SET "assignedTo" = GREATEST(assignment."assignedFrom", transaction_timestamp())
      FROM ranked
      WHERE assignment.id = ranked.id AND ranked.position > 1
    `);
    await queryRunner.query(`DROP INDEX "IDX_driver_assignments_active_pair"`);
    await queryRunner.query(`
      CREATE UNIQUE INDEX "IDX_driver_assignments_active_vehicle"
      ON "driver_vehicle_assignments" ("vehicleId")
      WHERE "assignedTo" IS NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "IDX_driver_assignments_active_vehicle"`,
    );
    await queryRunner.query(`
      CREATE UNIQUE INDEX "IDX_driver_assignments_active_pair"
      ON "driver_vehicle_assignments" ("driverId", "vehicleId")
      WHERE "assignedTo" IS NULL
    `);
  }
}
