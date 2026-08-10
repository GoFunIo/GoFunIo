import './helpers/test-env';
import { DataSource } from 'typeorm';
import { User } from '../src/users/users.entity';
import { TypeOrmEmailChangeStore } from '../src/users/email-change.store';
import { EmailChangeEmailInUseError } from '../src/users/email-change.errors';

describe('TypeOrmEmailChangeStore (integration)', () => {
  let dataSource: DataSource;
  let store: TypeOrmEmailChangeStore;

  beforeAll(async () => {
    dataSource = new DataSource({
      type: 'postgres',
      url: process.env.DATABASE_URL,
      schema: process.env.DATABASE_SCHEMA,
      entities: [User],
      synchronize: false,
      extra: {
        options: `-c search_path=${process.env.DATABASE_SCHEMA},public`,
      },
    });
    await dataSource.initialize();
    store = new TypeOrmEmailChangeStore(dataSource.getRepository(User));
  });

  afterAll(async () => dataSource?.destroy());

  async function seedUser(overrides: Partial<User> = {}): Promise<User> {
    return dataSource.getRepository(User).save(
      dataSource.getRepository(User).create({
        email: `user-${Date.now()}-${Math.random()}@example.com`,
        password: 'password.hash',
        emailVerifiedAt: new Date(),
        ...overrides,
      }),
    );
  }

  it('claims and atomically confirms an email change', async () => {
    const user = await seedUser({
      verificationTokenHash: 'verification-hash',
      verificationTokenExpiresAt: new Date(Date.now() + 60_000),
      passwordResetTokenHash: 'reset-hash',
      passwordResetTokenExpiresAt: new Date(Date.now() + 60_000),
    });
    await expect(
      store.claim(
        user.id,
        user.passwordVersion,
        'new@example.com',
        'change-hash',
        new Date(Date.now() + 60_000),
      ),
    ).resolves.toBe(true);

    await expect(store.consume('change-hash', new Date())).resolves.toBe(true);
    const row = await dataSource
      .getRepository(User)
      .createQueryBuilder('user')
      .addSelect([
        'user.emailChangeTokenHash',
        'user.verificationTokenHash',
        'user.verificationTokenExpiresAt',
        'user.passwordResetTokenHash',
        'user.passwordResetTokenExpiresAt',
      ])
      .where('user.id = :id', { id: user.id })
      .getOneOrFail();
    expect(row.email).toBe('new@example.com');
    expect(row.pendingEmail).toBeNull();
    expect(row.emailChangeTokenHash).toBeNull();
    expect(row.verificationTokenHash).toBeNull();
    expect(row.verificationTokenExpiresAt).toBeNull();
    expect(row.passwordResetTokenHash).toBeNull();
    expect(row.passwordResetTokenExpiresAt).toBeNull();
  });

  it('rejects stale credentials and invalid, expired or consumed tokens', async () => {
    const user = await seedUser();
    await expect(
      store.claim(
        user.id,
        user.passwordVersion - 1,
        'new@example.com',
        'token-hash',
        new Date(Date.now() + 60_000),
      ),
    ).resolves.toBe(false);
    await expect(store.consume('unknown', new Date())).resolves.toBe(false);

    await store.claim(
      user.id,
      user.passwordVersion,
      'new@example.com',
      'expired-hash',
      new Date(Date.now() - 1000),
    );
    await expect(store.consume('expired-hash', new Date())).resolves.toBe(
      false,
    );
  });

  it('serializes concurrent claims for the same email', async () => {
    const first = await seedUser();
    const second = await seedUser();
    const expiresAt = new Date(Date.now() + 60_000);
    const results = await Promise.allSettled([
      store.claim(
        first.id,
        first.passwordVersion,
        'claim@example.com',
        'one',
        expiresAt,
      ),
      store.claim(
        second.id,
        second.passwordVersion,
        'claim@example.com',
        'two',
        expiresAt,
      ),
    ]);

    expect(
      results.filter((result) => result.status === 'fulfilled'),
    ).toHaveLength(1);
    const rejected = results.find((result) => result.status === 'rejected');
    expect(rejected).toMatchObject({
      reason: expect.any(EmailChangeEmailInUseError),
    });
  });

  it('consumes only the latest token once', async () => {
    const user = await seedUser();
    const expiresAt = new Date(Date.now() + 60_000);
    await store.claim(
      user.id,
      user.passwordVersion,
      'first@example.com',
      'old',
      expiresAt,
    );
    await store.claim(
      user.id,
      user.passwordVersion,
      'latest@example.com',
      'latest',
      expiresAt,
    );

    await expect(store.consume('old', new Date())).resolves.toBe(false);
    const results = await Promise.all([
      store.consume('latest', new Date()),
      store.consume('latest', new Date()),
    ]);
    expect(results.sort()).toEqual([false, true]);
  });

  it('releases expired claims before assigning a new owner', async () => {
    const first = await seedUser();
    const second = await seedUser();
    await store.claim(
      first.id,
      first.passwordVersion,
      'released@example.com',
      'old',
      new Date(Date.now() - 1000),
    );

    await expect(
      store.claim(
        second.id,
        second.passwordVersion,
        'released@example.com',
        'new',
        new Date(Date.now() + 60_000),
      ),
    ).resolves.toBe(true);
  });
});
