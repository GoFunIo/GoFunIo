import './helpers/test-env';
import { DataSource } from 'typeorm';
import { User } from '../src/users/users.entity';
import { TypeOrmEmailVerificationStore } from '../src/users/email-verification.store';

describe('TypeOrmEmailVerificationStore (integration)', () => {
  let dataSource: DataSource;
  let store: TypeOrmEmailVerificationStore;

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
    store = new TypeOrmEmailVerificationStore(dataSource.getRepository(User));
  });

  afterAll(async () => {
    await dataSource?.destroy();
  });

  async function seedUser(overrides: Partial<User> = {}): Promise<User> {
    return dataSource.getRepository(User).save(
      dataSource.getRepository(User).create({
        email: `user-${Date.now()}-${Math.random()}@example.com`,
        password: 'salt.hash',
        ...overrides,
      }),
    );
  }

  describe('assign', () => {
    it('stores the token and returns userId + email for an unverified user', async () => {
      const user = await seedUser();
      const expiresAt = new Date(Date.now() + 60_000);

      const pending = await store.assign(user.email, 'hash-1', expiresAt);

      expect(pending).toEqual({ userId: user.id, email: user.email });
      const row = await dataSource
        .getRepository(User)
        .createQueryBuilder('user')
        .addSelect(['user.verificationTokenHash'])
        .where('user.id = :id', { id: user.id })
        .getOne();
      expect(row?.verificationTokenHash).toBe('hash-1');
    });

    it('returns null for an already verified user', async () => {
      const user = await seedUser({ emailVerifiedAt: new Date() });

      await expect(
        store.assign(user.email, 'hash-1', new Date(Date.now() + 60_000)),
      ).resolves.toBeNull();
    });

    it('returns null for an unknown email', async () => {
      await expect(
        store.assign('nobody@example.com', 'hash-1', new Date()),
      ).resolves.toBeNull();
    });
  });

  describe('consume', () => {
    it('marks the user verified, clears the token and returns userId', async () => {
      const user = await seedUser();
      await store.assign(user.email, 'hash-1', new Date(Date.now() + 60_000));

      const userId = await store.consume('hash-1', new Date());

      expect(userId).toBe(user.id);
      const row = await dataSource
        .getRepository(User)
        .createQueryBuilder('user')
        .addSelect([
          'user.verificationTokenHash',
          'user.verificationTokenExpiresAt',
        ])
        .where('user.id = :id', { id: user.id })
        .getOne();
      expect(row?.emailVerifiedAt).not.toBeNull();
      expect(row?.verificationTokenHash).toBeNull();
      expect(row?.verificationTokenExpiresAt).toBeNull();
    });

    it('returns null for an unknown token', async () => {
      await expect(store.consume('nope', new Date())).resolves.toBeNull();
    });

    it('returns null for an expired token', async () => {
      const user = await seedUser();
      await store.assign(user.email, 'hash-exp', new Date(Date.now() - 1000));

      await expect(store.consume('hash-exp', new Date())).resolves.toBeNull();
    });

    it('allows only one concurrent consume', async () => {
      const user = await seedUser();
      await store.assign(user.email, 'hash-1', new Date(Date.now() + 60_000));

      const results = await Promise.all([
        store.consume('hash-1', new Date()),
        store.consume('hash-1', new Date()),
      ]);

      expect(results.sort()).toEqual([null, user.id].sort());
    });

    it('only the latest assigned token is consumable', async () => {
      const user = await seedUser();
      await store.assign(user.email, 'hash-old', new Date(Date.now() + 60_000));
      await store.assign(user.email, 'hash-new', new Date(Date.now() + 60_000));

      await expect(store.consume('hash-old', new Date())).resolves.toBeNull();
      await expect(store.consume('hash-new', new Date())).resolves.toBe(
        user.id,
      );
    });
  });
});
