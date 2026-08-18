import './helpers/test-env';
import { DataSource } from 'typeorm';
import { User } from '../src/users/users.entity';
import { TypeOrmCredentialStore } from '../src/users/credential.store';

describe('TypeOrmCredentialStore (integration)', () => {
  let dataSource: DataSource;
  let store: TypeOrmCredentialStore;

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
    store = new TypeOrmCredentialStore(dataSource.getRepository(User));
  });

  afterAll(async () => dataSource?.destroy());

  async function seedUser(overrides: Partial<User> = {}): Promise<User> {
    return dataSource.getRepository(User).save(
      dataSource.getRepository(User).create({
        email: `credential-${Date.now()}-${Math.random()}@example.com`,
        password: 'password.hash',
        emailVerifiedAt: new Date(),
        ...overrides,
      }),
    );
  }

  it('is the only reader that explicitly returns the password hash', async () => {
    const user = await seedUser();

    const ordinary = await dataSource.getRepository(User).findOneByOrFail({
      id: user.id,
    });
    expect(ordinary.password).toBeUndefined();

    const credential = await store.findByEmail(user.email);
    expect(credential).toMatchObject({
      passwordHash: 'password.hash',
      emailVerified: true,
      account: { id: user.id, email: user.email, hasPassword: true },
    });
    expect(credential?.account).not.toHaveProperty('companyId');
    expect(credential?.account).not.toHaveProperty('role');
  });

  it('records login without exposing credentials', async () => {
    const user = await seedUser();
    const at = new Date();

    await expect(store.recordLogin(user.id, 'password.hash', at)).resolves.toBe(
      1,
    );

    await expect(
      dataSource.getRepository(User).findOneByOrFail({ id: user.id }),
    ).resolves.toMatchObject({ lastLoginAt: at });
  });

  it('changes a password once, increments its version and clears reset tokens', async () => {
    const user = await seedUser({
      passwordVersion: 3,
      passwordResetTokenHash: 'reset-hash',
      passwordResetTokenExpiresAt: new Date(Date.now() + 60_000),
    });

    const results = await Promise.all([
      store.updatePassword(user.id, 'password.hash', 'first.hash'),
      store.updatePassword(user.id, 'password.hash', 'second.hash'),
    ]);
    expect(results).toEqual(expect.arrayContaining([null, 4]));

    const row = await dataSource
      .getRepository(User)
      .createQueryBuilder('user')
      .addSelect([
        'user.password',
        'user.passwordResetTokenHash',
        'user.passwordResetTokenExpiresAt',
      ])
      .where('user.id = :id', { id: user.id })
      .getOneOrFail();
    expect(['first.hash', 'second.hash']).toContain(row.password);
    expect(row.passwordVersion).toBe(4);
    expect(row.passwordResetTokenHash).toBeNull();
    expect(row.passwordResetTokenExpiresAt).toBeNull();
  });
});
