import { MigrationInterface, QueryRunner } from 'typeorm';

const BUILT_IN_KINDS = `'OC', 'AC', 'TECHNICAL_INSPECTION'`;

export class CustomVehicleDeadlineKinds1770000000000 implements MigrationInterface {
  name = 'CustomVehicleDeadlineKinds1770000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "vehicle_deadline_custom_kinds" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "companyId" uuid NOT NULL,
        "label" varchar(60) NOT NULL,
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_vehicle_deadline_custom_kinds" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_vehicle_deadline_custom_kinds_id_company" UNIQUE ("id", "companyId"),
        CONSTRAINT "FK_vehicle_deadline_custom_kinds_company" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX "IDX_vehicle_deadline_custom_kinds_company_label"
      ON "vehicle_deadline_custom_kinds" ("companyId", lower("label"))
    `);
    await queryRunner.query(`
      CREATE TABLE "vehicle_deadline_custom_dates" (
        "vehicleId" uuid NOT NULL,
        "kindId" uuid NOT NULL,
        "companyId" uuid NOT NULL,
        "deadlineDate" date NOT NULL,
        CONSTRAINT "PK_vehicle_deadline_custom_dates" PRIMARY KEY ("vehicleId", "kindId"),
        CONSTRAINT "FK_vehicle_deadline_custom_dates_vehicle" FOREIGN KEY ("vehicleId", "companyId") REFERENCES "vehicles"("id", "companyId") ON DELETE CASCADE,
        CONSTRAINT "FK_vehicle_deadline_custom_dates_kind" FOREIGN KEY ("kindId", "companyId") REFERENCES "vehicle_deadline_custom_kinds"("id", "companyId") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_vehicle_deadline_custom_dates_kind"
      ON "vehicle_deadline_custom_dates" ("kindId")
    `);

    await queryRunner.query(`
      ALTER TABLE "vehicle_deadline_alert_policies"
      DROP CONSTRAINT "CHK_vehicle_deadline_alert_policies_kinds"
    `);
    await queryRunner.query(`
      ALTER TABLE "vehicle_deadline_alert_policies"
      ALTER COLUMN "enabledDeadlineKinds" TYPE text[]
      USING "enabledDeadlineKinds"::text[]
    `);
    await queryRunner.query(`
      ALTER TABLE "vehicle_deadline_notification_details"
      ALTER COLUMN "deadlineKind" TYPE text
      USING "deadlineKind"::text
    `);
    await queryRunner.query(
      `DROP FUNCTION "vehicle_deadline_kinds_valid"("vehicle_deadline_kind"[])`,
    );
    await queryRunner.query(`DROP TYPE "vehicle_deadline_kind"`);
    await this.createKindsCheck(queryRunner, 'text', 23);

    await queryRunner.query(`
      ALTER TABLE "vehicle_deadline_notification_details"
      ADD COLUMN "deadlineLabelSnapshot" varchar(60)
    `);

    await queryRunner.query(`
      CREATE VIEW "vehicle_deadline_dates" AS
      SELECT vehicle."companyId",
             vehicle.id AS "vehicleId",
             source.kind AS "deadlineKind",
             source.date AS "deadlineDate",
             NULL::varchar(60) AS "deadlineLabel"
        FROM "vehicles" vehicle
       CROSS JOIN LATERAL (VALUES
         ('OC'::text, vehicle."ocExpiry"),
         ('AC'::text, vehicle."acExpiry"),
         ('TECHNICAL_INSPECTION'::text, vehicle."technicalInspectionExpiry")
       ) AS source(kind, date)
       WHERE source.date IS NOT NULL
      UNION ALL
      SELECT custom."companyId",
             custom."vehicleId",
             custom."kindId"::text,
             custom."deadlineDate",
             kind.label
        FROM "vehicle_deadline_custom_dates" custom
        JOIN "vehicle_deadline_custom_kinds" kind
          ON kind.id = custom."kindId"
         AND kind."companyId" = custom."companyId"
    `);

    await queryRunner.query(`
      INSERT INTO "vehicle_deadline_custom_kinds" ("companyId", "label")
      SELECT company.id, seed.label
        FROM "companies" company
       CROSS JOIN (VALUES ('Wymiana oleju'), ('Wymiana świec')) AS seed(label)
    `);
    await queryRunner.query(`
      UPDATE "vehicle_deadline_alert_policies" policy
         SET "enabledDeadlineKinds" = policy."enabledDeadlineKinds" || ARRAY(
           SELECT kind.id::text
             FROM "vehicle_deadline_custom_kinds" kind
            WHERE kind."companyId" = policy."companyId"
            ORDER BY kind.label
         )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM "notifications" notification
       USING "vehicle_deadline_notification_details" detail
       WHERE detail."notificationId" = notification.id
         AND detail."companyId" = notification."companyId"
         AND detail."deadlineKind" NOT IN (${BUILT_IN_KINDS})
    `);
    await queryRunner.query(`DROP VIEW "vehicle_deadline_dates"`);
    await queryRunner.query(`
      ALTER TABLE "vehicle_deadline_notification_details"
      DROP COLUMN "deadlineLabelSnapshot"
    `);

    await queryRunner.query(`
      ALTER TABLE "vehicle_deadline_alert_policies"
      DROP CONSTRAINT "CHK_vehicle_deadline_alert_policies_kinds"
    `);
    await queryRunner.query(
      `DROP FUNCTION "vehicle_deadline_kinds_valid"(text[])`,
    );
    await queryRunner.query(`
      UPDATE "vehicle_deadline_alert_policies"
         SET "enabledDeadlineKinds" = ARRAY(
           SELECT item.kind
             FROM unnest("enabledDeadlineKinds") AS item(kind)
            WHERE item.kind IN (${BUILT_IN_KINDS})
         )
    `);
    await queryRunner.query(
      `CREATE TYPE "vehicle_deadline_kind" AS ENUM (${BUILT_IN_KINDS})`,
    );
    await queryRunner.query(`
      ALTER TABLE "vehicle_deadline_alert_policies"
      ALTER COLUMN "enabledDeadlineKinds" TYPE "vehicle_deadline_kind"[]
      USING "enabledDeadlineKinds"::"vehicle_deadline_kind"[]
    `);
    await queryRunner.query(`
      ALTER TABLE "vehicle_deadline_notification_details"
      ALTER COLUMN "deadlineKind" TYPE "vehicle_deadline_kind"
      USING "deadlineKind"::"vehicle_deadline_kind"
    `);
    await this.createKindsCheck(queryRunner, '"vehicle_deadline_kind"', 3);

    await queryRunner.query(`DROP TABLE "vehicle_deadline_custom_dates"`);
    await queryRunner.query(`DROP TABLE "vehicle_deadline_custom_kinds"`);
  }

  private async createKindsCheck(
    queryRunner: QueryRunner,
    elementType: string,
    maxKinds: number,
  ): Promise<void> {
    await queryRunner.query(`
      CREATE FUNCTION "vehicle_deadline_kinds_valid"("input" ${elementType}[])
      RETURNS boolean
      LANGUAGE sql
      IMMUTABLE
      STRICT
      AS $$
        SELECT cardinality("input") BETWEEN 0 AND ${maxKinds}
          AND cardinality("input") = cardinality(
            ARRAY(SELECT DISTINCT value FROM unnest("input") AS item(value))
          )
      $$
    `);
    await queryRunner.query(`
      ALTER TABLE "vehicle_deadline_alert_policies"
      ADD CONSTRAINT "CHK_vehicle_deadline_alert_policies_kinds"
      CHECK ("vehicle_deadline_kinds_valid"("enabledDeadlineKinds"))
    `);
  }
}
