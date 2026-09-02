import { MigrationInterface, QueryRunner } from 'typeorm';

export class RestoreMultipleActiveDriverAllocations1769000000000 implements MigrationInterface {
  name = 'RestoreMultipleActiveDriverAllocations1769000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await this.restoreDriverAllocationConstraint(queryRunner);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Reintroducing the single-driver index would restore the production bug
    // and could fail after a Vehicle gains multiple active Driver Allocations.
    await this.restoreDriverAllocationConstraint(queryRunner);
  }

  private async restoreDriverAllocationConstraint(
    queryRunner: QueryRunner,
  ): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_driver_assignments_active_vehicle"`,
    );
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "IDX_driver_assignments_active_pair"
      ON "driver_vehicle_assignments" ("driverId", "vehicleId")
      WHERE "assignedTo" IS NULL
    `);
  }
}
