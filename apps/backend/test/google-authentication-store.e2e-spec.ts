import './helpers/test-env';
import { DataSource } from 'typeorm';
import { Company } from '../src/companies/companies.entity';
import { GoogleAccountConflictError } from '../src/users/google-authentication.errors';
import { TypeOrmGoogleAuthenticationStore } from '../src/users/google-authentication.store';
import { MembershipRole } from '../src/users/membership-role';
import { User } from '../src/users/users.entity';

describe('TypeOrmGoogleAuthenticationStore (integration)', () => {
  let dataSource: DataSource;
  let store: TypeOrmGoogleAuthenticationStore;

  beforeAll(async () => {
    dataSource = new DataSource({
      type: 'postgres',
      url: process.env.DATABASE_URL,
      schema: process.env.DATABASE_SCHEMA,
      entities: [User, Company],
      synchronize: false,
      extra: {
        options: `-c search_path=${process.env.DATABASE_SCHEMA},public`,
      },
    });
    await dataSource.initialize();
    store = new TypeOrmGoogleAuthenticationStore(
      dataSource.getRepository(User),
    );
  });

  afterAll(async () => dataSource?.destroy());

  async function seedUser(
    suffix: string,
    overrides: Partial<User> = {},
  ): Promise<User> {
    const company = await dataSource.getRepository(Company).save({
      name: `Google Store ${suffix}`,
    });
    return dataSource.getRepository(User).save({
      companyId: company.id,
      email: `google-store-${suffix}-${Date.now()}@example.com`,
      password: `${suffix}.password.hash`,
      emailVerifiedAt: new Date(),
      role: MembershipRole.ADMIN,
      ...overrides,
    });
  }

  it('links only when googleId and password hash are unchanged', async () => {
    const user = await seedUser('cas');

    await expect(
      store.link(user.id, 'google-cas', new Date(), {
        email: user.email,
        passwordHash: 'wrong.hash',
      }),
    ).resolves.toBe(false);
    await expect(
      store.link(user.id, 'google-cas', new Date(), {
        email: user.email,
        passwordHash: 'cas.password.hash',
      }),
    ).resolves.toBe(true);
    await expect(
      store.link(user.id, 'google-other', new Date(), {
        email: user.email,
        passwordHash: 'cas.password.hash',
      }),
    ).resolves.toBe(false);
  });

  it('links only while email and verification state are unchanged', async () => {
    const user = await seedUser('identity-cas');
    const unverified = await seedUser('unverified-cas', {
      emailVerifiedAt: null,
    });

    await expect(
      store.link(user.id, 'google-wrong-email', new Date(), {
        email: 'other@example.com',
        emailVerified: true,
      }),
    ).resolves.toBe(false);
    await expect(
      store.link(unverified.id, 'google-unverified', new Date(), {
        email: unverified.email,
        emailVerified: true,
      }),
    ).resolves.toBe(false);
  });

  it('maps a concurrent googleId claim to a stable conflict', async () => {
    const first = await seedUser('first');
    const second = await seedUser('second');

    await store.link(first.id, 'shared-google', new Date(), {
      email: first.email,
    });
    await expect(
      store.link(second.id, 'shared-google', new Date(), {
        email: second.email,
      }),
    ).rejects.toBeInstanceOf(GoogleAccountConflictError);
  });
});
