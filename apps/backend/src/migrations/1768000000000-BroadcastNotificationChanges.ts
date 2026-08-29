import { MigrationInterface, QueryRunner } from 'typeorm';

export class BroadcastNotificationChanges1768000000000 implements MigrationInterface {
  name = 'BroadcastNotificationChanges1768000000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "notification_changes" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "companyId" uuid NOT NULL,
        "userId" uuid,
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_notification_changes" PRIMARY KEY ("id"),
        CONSTRAINT "FK_notification_changes_company"
          FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_notification_changes_membership"
          FOREIGN KEY ("userId", "companyId")
          REFERENCES "memberships"("userId", "companyId") ON DELETE CASCADE
      )`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_notification_changes_createdAt"
         ON "notification_changes" ("createdAt")`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "notification_changes"`);
  }
}
