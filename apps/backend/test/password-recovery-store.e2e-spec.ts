import './helpers/test-env';
import { DataSource } from 'typeorm';
import { Company } from '../src/companies/companies.entity';
import { User } from '../src/users/users.entity';
import { MembershipRole } from '../src/users/membership-role';
import { Membership } from '../src/users/membership.entity';
import { TypeOrmPasswordRecoveryStore } from '../src/users/password-recovery.store';

describe('TypeOrmPasswordRecoveryStore (integration)', () => {
  let dataSource: DataSource;
  let store: TypeOrmPasswordRecoveryStore;

  beforeAll(async () => {
    dataSource = new DataSource({
      type: 'postgres',
      url: process.env.DATABASE_URL,
      schema: process.env.DATABASE_SCHEMA,
      entities: [User, Company, Membership],
      synchronize: false,
      extra: {
        options: `-c search_path=${process.env.DATABASE_SCHEMA},public`,
      },
    });
    await dataSource.initialize();
    store = new TypeOrmPasswordRecoveryStore(dataSource.getRepository(User));
  });

  afterAll(async () => {
    await dataSource?.destroy();
  });

  async function seedUser(overrides: Partial<User> = {}): Promise<User> {
    return dataSource.getRepository(User).save(
      dataSource.getRepository(User).create({
        email: `user-${Date.now()}-${Math.random()}@example.com`,
        password: 'old.hash',
        emailVerifiedAt: new Date(),
        ...overrides,
      }),
    );
  }

  it('assigns recovery by email and identifies first-password accounts', async () => {
    const regular = await seedUser();
    const firstPassword = await seedUser({
      password: null,
      emailVerifiedAt: null,
    });
    const expiresAt = new Date(Date.now() + 60_000);

    await expect(
      store.assignByEmail(regular.email, 'regular-hash', expiresAt),
    ).resolves.toEqual({
      userId: regular.id,
      email: regular.email,
      isFirstPassword: false,
    });
    await expect(
      store.assignByEmail(firstPassword.email, 'first-hash', expiresAt),
    ).resolves.toEqual({
      userId: firstPassword.id,
      email: firstPassword.email,
      isFirstPassword: true,
    });
    await expect(
      store.assignByEmail('missing@example.com', 'missing-hash', expiresAt),
    ).resolves.toBeNull();
  });

  it('assigns first-password only to passwordless users', async () => {
    const regular = await seedUser();
    const firstPassword = await seedUser({
      password: null,
      emailVerifiedAt: null,
    });
    const expiresAt = new Date(Date.now() + 60_000);

    await expect(
      store.assignFirstPassword(regular.id, 'regular-hash', expiresAt),
    ).resolves.toBeNull();
    await expect(
      store.assignFirstPassword(firstPassword.id, 'first-hash', expiresAt),
    ).resolves.toEqual({
      userId: firstPassword.id,
      email: firstPassword.email,
      isFirstPassword: true,
    });
  });

  it('atomically resets password and increments passwordVersion', async () => {
    const user = await seedUser({ passwordVersion: 3 });
    await store.assignByEmail(
      user.email,
      'token-hash',
      new Date(Date.now() + 60_000),
    );

    await expect(
      store.consume('token-hash', 'new.hash', new Date()),
    ).resolves.toBe(true);

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
    expect(row.password).toBe('new.hash');
    expect(row.passwordVersion).toBe(4);
    expect(row.passwordResetTokenHash).toBeNull();
    expect(row.passwordResetTokenExpiresAt).toBeNull();
  });

  it('verifies the email when setting the first password', async () => {
    const user = await seedUser({ password: null, emailVerifiedAt: null });
    await store.assignFirstPassword(
      user.id,
      'token-hash',
      new Date(Date.now() + 60_000),
    );

    await store.consume('token-hash', 'first.hash', new Date());

    const row = await dataSource
      .getRepository(User)
      .createQueryBuilder('user')
      .addSelect('user.password')
      .where('user.id = :id', { id: user.id })
      .getOneOrFail();
    expect(row.password).toBe('first.hash');
    expect(row.emailVerifiedAt).toBeInstanceOf(Date);
  });

  it('does not accept pending invitations during regular password recovery', async () => {
    const user = await seedUser({ password: null, emailVerifiedAt: null });
    const invitedCompany = await dataSource.getRepository(Company).save({
      name: 'Invited Co',
    });
    const membership = await dataSource.getRepository(Membership).save({
      userId: user.id,
      companyId: invitedCompany.id,
      role: MembershipRole.MANAGER,
      status: 'pending',
    });
    await store.assignByEmail(
      user.email,
      'regular-reset-hash',
      new Date(Date.now() + 60_000),
    );

    await store.consume('regular-reset-hash', 'new.hash', new Date());

    await expect(
      dataSource.getRepository(Membership).findOneByOrFail({
        id: membership.id,
      }),
    ).resolves.toMatchObject({ status: 'pending' });
  });

  it('accepts only the invitation linked to the first-password token', async () => {
    const user = await seedUser({ password: null, emailVerifiedAt: null });
    const companies = await dataSource
      .getRepository(Company)
      .save([{ name: 'First invitation' }, { name: 'Second invitation' }]);
    const memberships = await dataSource.getRepository(Membership).save(
      companies.map((company) => ({
        userId: user.id,
        companyId: company.id,
        role: MembershipRole.MANAGER,
        status: 'pending',
      })),
    );
    await store.assignFirstPassword(
      user.id,
      'linked-token',
      new Date(Date.now() + 60_000),
      memberships[0].id,
    );

    await store.consume('linked-token', 'first.hash', new Date());

    await expect(
      dataSource.getRepository(Membership).findBy({ userId: user.id }),
    ).resolves.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: memberships[0].id, status: 'active' }),
        expect.objectContaining({ id: memberships[1].id, status: 'pending' }),
      ]),
    );
  });

  it('rejects unknown, expired and consumed tokens', async () => {
    const user = await seedUser();
    await expect(
      store.consume('unknown', 'new.hash', new Date()),
    ).resolves.toBe(false);

    await store.assignByEmail(
      user.email,
      'expired',
      new Date(Date.now() - 1000),
    );
    await expect(
      store.consume('expired', 'new.hash', new Date()),
    ).resolves.toBe(false);

    await store.assignByEmail(
      user.email,
      'consumed',
      new Date(Date.now() + 60_000),
    );
    await store.consume('consumed', 'new.hash', new Date());
    await expect(
      store.consume('consumed', 'another.hash', new Date()),
    ).resolves.toBe(false);
  });

  it('allows only one concurrent consume and only the latest token', async () => {
    const user = await seedUser();
    await store.assignByEmail(
      user.email,
      'old-hash',
      new Date(Date.now() + 60_000),
    );
    await store.assignByEmail(
      user.email,
      'new-hash',
      new Date(Date.now() + 60_000),
    );

    await expect(
      store.consume('old-hash', 'old.password', new Date()),
    ).resolves.toBe(false);
    const results = await Promise.all([
      store.consume('new-hash', 'first.password', new Date()),
      store.consume('new-hash', 'second.password', new Date()),
    ]);
    expect(results.sort()).toEqual([false, true]);
  });
});
