import { MigrationInterface, QueryRunner } from 'typeorm';

export class PrepareNotificationDeliveries1767000000000 implements MigrationInterface {
  name = 'PrepareNotificationDeliveries1767000000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "notification_deliveries"
         ALTER COLUMN "recipientAddress" TYPE varchar(254),
         ALTER COLUMN "providerMessageId" TYPE varchar(255),
         ADD COLUMN "updatedAt" timestamptz NOT NULL DEFAULT now(),
         ADD CONSTRAINT "CHK_notification_delivery_attempts" CHECK ("attempts" >= 0)`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_notification_deliveries_due"
         ON "notification_deliveries" ("nextAttemptAt", "lockedAt", "id")
         WHERE status IN ('PENDING', 'SENDING')`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_notification_deliveries_due"`);
    await queryRunner.query(
      `ALTER TABLE "notification_deliveries"
         DROP CONSTRAINT "CHK_notification_delivery_attempts",
         DROP COLUMN "updatedAt",
         ALTER COLUMN "providerMessageId" TYPE varchar,
         ALTER COLUMN "recipientAddress" TYPE varchar`,
    );
  }
}
