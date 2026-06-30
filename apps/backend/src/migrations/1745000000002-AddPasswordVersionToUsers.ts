import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddPasswordVersionToUsers1745000000002 implements MigrationInterface {
  name = 'AddPasswordVersionToUsers1745000000002';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'users',
      new TableColumn({
        name: 'passwordVersion',
        type: 'int',
        default: 1,
      }),
    );

    // ponytail: fix drift if 1745000000001 ran with timestamp before timestamptz change
    await queryRunner.query(
      `ALTER TABLE "users" ALTER COLUMN "passwordResetTokenExpiresAt" TYPE timestamptz USING "passwordResetTokenExpiresAt" AT TIME ZONE 'UTC'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('users', 'passwordVersion');
    await queryRunner.query(
      `ALTER TABLE "users" ALTER COLUMN "passwordResetTokenExpiresAt" TYPE timestamp USING "passwordResetTokenExpiresAt" AT TIME ZONE 'UTC'`,
    );
  }
}
