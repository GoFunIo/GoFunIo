import { MigrationInterface, QueryRunner } from 'typeorm';

export class PersistVehicleDeadlineAlertPolicy1764000000000 implements MigrationInterface {
  name = 'PersistVehicleDeadlineAlertPolicy1764000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "vehicle_deadline_kind" AS ENUM ('OC', 'AC', 'TECHNICAL_INSPECTION')`,
    );
    await queryRunner.query(`
      CREATE FUNCTION "vehicle_deadline_kinds_valid"("input" "vehicle_deadline_kind"[])
      RETURNS boolean
      LANGUAGE sql
      IMMUTABLE
      STRICT
      AS $$
        SELECT cardinality("input") BETWEEN 0 AND 3
          AND cardinality("input") = cardinality(
            ARRAY(SELECT DISTINCT value FROM unnest("input") AS item(value))
          )
      $$
    `);
    await queryRunner.query(`
      CREATE FUNCTION "vehicle_deadline_lead_days_valid"("input" smallint[])
      RETURNS boolean
      LANGUAGE sql
      IMMUTABLE
      STRICT
      AS $$
        SELECT cardinality("input") BETWEEN 1 AND 10
          AND NOT EXISTS (
            SELECT 1 FROM unnest("input") AS item(value)
            WHERE value < 0 OR value > 365
          )
          AND NOT EXISTS (
            SELECT 1
            FROM generate_subscripts("input", 1) AS positions(position)
            WHERE position < cardinality("input")
              AND "input"[position] <= "input"[position + 1]
          )
      $$
    `);
    await queryRunner.query(`
      CREATE TABLE "vehicle_deadline_alert_policies" (
        "companyId" uuid NOT NULL,
        "enabledDeadlineKinds" "vehicle_deadline_kind" array NOT NULL,
        "leadDays" smallint array NOT NULL,
        "timeZone" text NOT NULL,
        "activatedAt" timestamptz NOT NULL,
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_vehicle_deadline_alert_policies" PRIMARY KEY ("companyId"),
        CONSTRAINT "FK_vehicle_deadline_alert_policies_company" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE,
        CONSTRAINT "CHK_vehicle_deadline_alert_policies_kinds" CHECK ("vehicle_deadline_kinds_valid"("enabledDeadlineKinds")),
        CONSTRAINT "CHK_vehicle_deadline_alert_policies_lead_days" CHECK ("vehicle_deadline_lead_days_valid"("leadDays"))
      )
    `);
    await queryRunner.query(`
      INSERT INTO "vehicle_deadline_alert_policies"
        ("companyId", "enabledDeadlineKinds", "leadDays", "timeZone", "activatedAt")
      SELECT id,
             ARRAY['OC', 'AC', 'TECHNICAL_INSPECTION']::"vehicle_deadline_kind"[],
             ARRAY[30, 14, 7, 0]::smallint[],
             'Europe/Warsaw',
             CURRENT_TIMESTAMP
      FROM "companies"
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "vehicle_deadline_alert_policies"`);
    await queryRunner.query(
      `DROP FUNCTION "vehicle_deadline_lead_days_valid"(smallint[])`,
    );
    await queryRunner.query(
      `DROP FUNCTION "vehicle_deadline_kinds_valid"("vehicle_deadline_kind"[])`,
    );
    await queryRunner.query(`DROP TYPE "vehicle_deadline_kind"`);
  }
}
