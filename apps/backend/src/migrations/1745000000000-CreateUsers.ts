import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class CreateUsers1745000000000 implements MigrationInterface {
  name = 'CreateUsers1745000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'users',
        columns: [
          {
            name: 'id',
            type: 'int',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          {
            name: 'email',
            type: 'varchar',
            isUnique: true,
          },
          {
            name: 'password',
            type: 'varchar',
          },
          {
            name: 'isVerified',
            type: 'boolean',
            default: false,
          },
          {
            name: 'verificationTokenHash',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'verificationTokenExpiresAt',
            type: 'timestamp',
            isNullable: true,
          },
        ],
      }),
      true,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('users');
  }
}
