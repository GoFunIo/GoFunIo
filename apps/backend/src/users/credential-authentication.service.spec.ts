import { CredentialAuthenticationService } from './credential-authentication.service';
import {
  CredentialChangedError,
  CredentialEmailNotVerifiedError,
  CredentialPasswordRequiredError,
  InvalidCredentialsError,
} from './credential-authentication.errors';
import { InMemoryCredentialStore } from './credential.store';
import { FakePasswordHasher } from './password-hasher';

describe('CredentialAuthenticationService', () => {
  let store: InMemoryCredentialStore;
  let hasher: FakePasswordHasher;
  let service: CredentialAuthenticationService;

  beforeEach(() => {
    store = new InMemoryCredentialStore();
    hasher = new FakePasswordHasher();
    service = new CredentialAuthenticationService(store, hasher);
  });

  async function seed(
    overrides: Partial<Parameters<InMemoryCredentialStore['seed']>[0]> = {},
  ) {
    const passwordHash = await hasher.hash('password123');
    store.seed({
      id: 'user-1',
      email: 'user@example.com',
      firstName: null,
      lastName: null,
      phone: null,
      address: null,
      postalCode: null,
      city: null,
      pendingEmail: null,
      hasPassword: true,
      passwordHash,
      emailVerified: true,
      passwordVersion: 1,
      lastLoginAt: null,
      ...overrides,
    });
    hasher.verifyCalls.length = 0;
  }

  it('signs in with one password verification and returns a safe account', async () => {
    await seed();

    const authenticated = await service.signin(
      ' User@Example.com ',
      'password123',
    );

    expect(authenticated.account).toMatchObject({
      id: 'user-1',
      email: 'user@example.com',
      hasPassword: true,
    });
    expect(authenticated.passwordVersion).toBe(1);
    expect(authenticated.account).not.toHaveProperty('passwordHash');
    expect(authenticated.account).not.toHaveProperty('companyId');
    expect(authenticated.account).not.toHaveProperty('role');
    expect(hasher.verifyCalls).toHaveLength(1);
    expect(store.get('user-1')?.lastLoginAt).toBeInstanceOf(Date);
  });

  it.each([
    ['missing account', undefined],
    ['passwordless account', { passwordHash: null, hasPassword: false }],
  ])('hides a %s behind one verification', async (_label, overrides) => {
    if (overrides) await seed(overrides);

    await expect(
      service.signin('user@example.com', 'password123'),
    ).rejects.toThrow(InvalidCredentialsError);
    expect(hasher.verifyCalls).toHaveLength(1);
  });

  it('rejects an unverified account after checking the password', async () => {
    await seed({ emailVerified: false });

    await expect(
      service.signin('user@example.com', 'password123'),
    ).rejects.toThrow(CredentialEmailNotVerifiedError);
    expect(hasher.verifyCalls).toHaveLength(1);
  });

  it('changes the password with compare-and-set semantics', async () => {
    await seed({ passwordVersion: 3 });

    await expect(
      service.changePassword('user-1', 'password123', 'new-password'),
    ).resolves.toBe(4);

    const user = store.get('user-1')!;
    expect(user.passwordVersion).toBe(4);
    await expect(
      hasher.verify('new-password', user.passwordHash),
    ).resolves.toBe(true);
  });

  it('requires password recovery for passwordless accounts', async () => {
    await seed({ passwordHash: null, hasPassword: false });

    await expect(
      service.changePassword('user-1', 'password123', 'new-password'),
    ).rejects.toThrow(CredentialPasswordRequiredError);
  });

  it('rejects a concurrent credential change', async () => {
    await seed();
    jest.spyOn(store, 'updatePassword').mockResolvedValue(null);

    await expect(
      service.changePassword('user-1', 'password123', 'new-password'),
    ).rejects.toThrow(CredentialChangedError);
  });
});
