import './helpers/test-env';
import { DataSource } from 'typeorm';
import { Company } from '../src/companies/companies.entity';
import { EmailRegistrationEmailInUseError } from '../src/users/email-registration.errors';
import { Membership } from '../src/users/membership.entity';
import { MembershipRole } from '../src/users/membership-role';
import { User } from '../src/users/users.entity';
import { TypeOrmWorkspaceOwnerProvisioner } from '../src/users/workspace-owner-provisioner';

describe('TypeOrmWorkspaceOwnerProvisioner (integration)', () => {
  let dataSource: DataSource;
  let provisioner: TypeOrmWorkspaceOwnerProvisioner;

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
    provisioner = new TypeOrmWorkspaceOwnerProvisioner(
      dataSource.getRepository(User),
    );
  });

  afterAll(async () => dataSource?.destroy());

  function input(email: string, suffix = 'one') {
    return {
      email,
      passwordHash: `${suffix}.password.hash`,
      verificationTokenHash: `${suffix}.token.hash`,
      verificationTokenExpiresAt: new Date(Date.now() + 60_000),
    };
  }

  it('atomically creates workspace, owner, membership and challenge', async () => {
    const email = `signup-${Date.now()}@example.com`;
    const account = await provisioner.provision(input(email));

    const user = await dataSource
      .getRepository(User)
      .createQueryBuilder('user')
      .addSelect(['user.password', 'user.verificationTokenHash'])
      .where('user.id = :id', { id: account.id })
      .getOneOrFail();
    expect(user).toMatchObject({
      email,
      password: 'one.password.hash',
      verificationTokenHash: 'one.token.hash',
      role: MembershipRole.ADMIN,
    });
    await expect(
      dataSource.getRepository(Company).findOneByOrFail({ id: user.companyId }),
    ).resolves.toBeDefined();
    await expect(
      dataSource.getRepository(Membership).findOneByOrFail({
        userId: user.id,
        companyId: user.companyId,
        role: MembershipRole.ADMIN,
        status: 'active',
      }),
    ).resolves.toBeDefined();
    expect(account).not.toHaveProperty('companyId');
    expect(account).not.toHaveProperty('role');
    expect(account).not.toHaveProperty('password');
  });

  it('allows only one concurrent owner for an email', async () => {
    const email = `concurrent-${Date.now()}@example.com`;
    const companiesBefore = await dataSource.getRepository(Company).count();
    const results = await Promise.allSettled([
      provisioner.provision(input(email, 'one')),
      provisioner.provision(input(email, 'two')),
    ]);

    expect(results.filter(({ status }) => status === 'fulfilled')).toHaveLength(
      1,
    );
    expect(results.find(({ status }) => status === 'rejected')).toMatchObject({
      reason: expect.any(EmailRegistrationEmailInUseError),
    });
    const [user] = await dataSource.getRepository(User).findBy({ email });
    expect(user).toBeDefined();
    await expect(
      dataSource.getRepository(Membership).countBy({ userId: user.id }),
    ).resolves.toBe(1);
    await expect(dataSource.getRepository(Company).count()).resolves.toBe(
      companiesBefore + 1,
    );
  });
});
