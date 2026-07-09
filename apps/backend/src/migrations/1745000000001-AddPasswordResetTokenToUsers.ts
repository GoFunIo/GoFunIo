import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddPasswordResetTokenToUsers1745000000001 implements MigrationInterface {
  name = 'AddPasswordResetTokenToUsers1745000000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumns('users', [
      new TableColumn({
        name: 'passwordResetTokenHash',
        type: 'varchar',
        isNullable: true,
      }),
      new TableColumn({
        name: 'passwordResetTokenExpiresAt',
        type: 'timestamptz',
        isNullable: true,
      }),
    ]);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('users', 'passwordResetTokenExpiresAt');
    await queryRunner.dropColumn('users', 'passwordResetTokenHash');
  }
}
