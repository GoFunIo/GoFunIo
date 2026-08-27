import { MigrationInterface, QueryRunner } from 'typeorm';

export class PersistMembershipNotificationPreferences1765000000000 implements MigrationInterface {
  name = 'PersistMembershipNotificationPreferences1765000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "notification_category" AS ENUM (
        'FLEET_DEADLINES', 'VEHICLE_ACCESS', 'MEMBERSHIP', 'SERVICE', 'PRODUCT'
      )
    `);
    await queryRunner.query(`
      CREATE TYPE "notification_email_mode" AS ENUM ('OFF', 'IMMEDIATE')
    `);
    await queryRunner.query(`
      ALTER TABLE "memberships"
      ADD CONSTRAINT "UQ_memberships_id_company" UNIQUE ("id", "companyId")
    `);
    await queryRunner.query(`
      CREATE TABLE "notification_preferences" (
        "companyId" uuid NOT NULL,
        "membershipId" uuid NOT NULL,
        "category" "notification_category" NOT NULL,
        "emailMode" "notification_email_mode" NOT NULL,
        "showLiveToasts" boolean NOT NULL,
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_notification_preferences" PRIMARY KEY ("companyId", "membershipId", "category"),
        CONSTRAINT "FK_notification_preferences_membership" FOREIGN KEY ("membershipId", "companyId") REFERENCES "memberships"("id", "companyId") ON DELETE CASCADE
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "notification_preferences"`);
    await queryRunner.query(
      `ALTER TABLE "memberships" DROP CONSTRAINT "UQ_memberships_id_company"`,
    );
    await queryRunner.query(`DROP TYPE "notification_email_mode"`);
    await queryRunner.query(`DROP TYPE "notification_category"`);
  }
}
