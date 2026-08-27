import { MigrationInterface, QueryRunner } from 'typeorm';

export class PersistVehicleDeadlineNotifications1766000000000 implements MigrationInterface {
  name = 'PersistVehicleDeadlineNotifications1766000000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "notification_type" AS ENUM ('VEHICLE_DEADLINE_REACHED')`,
    );
    await queryRunner.query(
      `CREATE TYPE "notification_channel" AS ENUM ('EMAIL')`,
    );
    await queryRunner.query(
      `CREATE TYPE "notification_delivery_status" AS ENUM ('PENDING', 'SENDING', 'SENT', 'FAILED', 'CANCELLED')`,
    );
    await queryRunner.query(`
      CREATE TABLE "notifications" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "companyId" uuid NOT NULL,
        "type" "notification_type" NOT NULL,
        "category" "notification_category" NOT NULL,
        "rendererVersion" smallint NOT NULL,
        "occurredAt" timestamptz NOT NULL,
        "expiresAt" timestamptz,
        "invalidatedAt" timestamptz,
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_notifications" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_notifications_id_company" UNIQUE ("id", "companyId"),
        CONSTRAINT "FK_notifications_company" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT
      )`);
    await queryRunner.query(`
      CREATE TABLE "vehicle_deadline_notification_details" (
        "notificationId" uuid NOT NULL,
        "companyId" uuid NOT NULL,
        "vehicleId" uuid NOT NULL,
        "deadlineKind" "vehicle_deadline_kind" NOT NULL,
        "deadlineDate" date NOT NULL,
        "leadDay" smallint NOT NULL,
        "registrationNumberSnapshot" varchar(10) NOT NULL,
        CONSTRAINT "PK_vehicle_deadline_notification_details" PRIMARY KEY ("notificationId"),
        CONSTRAINT "UQ_vehicle_deadline_notification_trigger" UNIQUE ("companyId", "vehicleId", "deadlineKind", "deadlineDate", "leadDay"),
        CONSTRAINT "FK_vehicle_deadline_detail_notification" FOREIGN KEY ("notificationId", "companyId") REFERENCES "notifications"("id", "companyId") ON DELETE CASCADE,
        CONSTRAINT "FK_vehicle_deadline_detail_vehicle" FOREIGN KEY ("vehicleId", "companyId") REFERENCES "vehicles"("id", "companyId") ON DELETE RESTRICT
      )`);
    await queryRunner.query(`
      CREATE TABLE "notification_recipients" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "companyId" uuid NOT NULL,
        "notificationId" uuid NOT NULL,
        "membershipId" uuid NOT NULL,
        "readAt" timestamptz,
        "archivedAt" timestamptz,
        "revokedAt" timestamptz,
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_notification_recipients" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_notification_recipients_id_company" UNIQUE ("id", "companyId"),
        CONSTRAINT "UQ_notification_recipient_membership" UNIQUE ("companyId", "notificationId", "membershipId"),
        CONSTRAINT "FK_notification_recipient_notification" FOREIGN KEY ("notificationId", "companyId") REFERENCES "notifications"("id", "companyId") ON DELETE CASCADE,
        CONSTRAINT "FK_notification_recipient_membership" FOREIGN KEY ("membershipId", "companyId") REFERENCES "memberships"("id", "companyId") ON DELETE RESTRICT
      )`);
    await queryRunner.query(
      `CREATE INDEX "IDX_notification_recipients_membership" ON "notification_recipients" ("companyId", "membershipId", "notificationId") WHERE "revokedAt" IS NULL`,
    );
    await queryRunner.query(`
      CREATE TABLE "notification_deliveries" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "companyId" uuid NOT NULL,
        "recipientId" uuid NOT NULL,
        "channel" "notification_channel" NOT NULL,
        "status" "notification_delivery_status" NOT NULL DEFAULT 'PENDING',
        "attempts" integer NOT NULL DEFAULT 0,
        "nextAttemptAt" timestamptz NOT NULL,
        "lockedAt" timestamptz,
        "recipientAddress" varchar,
        "providerMessageId" varchar,
        "lastError" varchar(500),
        "sentAt" timestamptz,
        "completedAt" timestamptz,
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_notification_deliveries" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_notification_delivery_channel" UNIQUE ("companyId", "recipientId", "channel"),
        CONSTRAINT "FK_notification_delivery_recipient" FOREIGN KEY ("recipientId", "companyId") REFERENCES "notification_recipients"("id", "companyId") ON DELETE CASCADE
      )`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "notification_deliveries"`);
    await queryRunner.query(`DROP TABLE "notification_recipients"`);
    await queryRunner.query(
      `DROP TABLE "vehicle_deadline_notification_details"`,
    );
    await queryRunner.query(`DROP TABLE "notifications"`);
    await queryRunner.query(`DROP TYPE "notification_delivery_status"`);
    await queryRunner.query(`DROP TYPE "notification_channel"`);
    await queryRunner.query(`DROP TYPE "notification_type"`);
  }
}
