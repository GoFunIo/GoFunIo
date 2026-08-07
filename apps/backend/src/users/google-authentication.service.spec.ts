import { InMemoryCredentialStore } from './credential.store';
import {
  GoogleAccountConflictError,
  GoogleEmailUnverifiedError,
  GoogleExplicitLinkRequiredError,
  GoogleLinkChangedError,
  InvalidGoogleLinkCredentialsError,
} from './google-authentication.errors';
import {
  InMemoryGoogleAuthenticationStore,
  type GoogleAccountRecord,
} from './google-authentication.store';
import { GoogleAuthenticationService } from './google-authentication.service';
import { FakeGoogleIdentityVerifier } from './google-identity-verifier';
import { FakePasswordHasher } from './password-hasher';
import type { UserAccount } from './user-account';
import {
  FakeWorkspaceOwnerProvisioner,
  WorkspaceOwnerConflictError,
} from './workspace-owner-provisioner';

function account(overrides: Partial<UserAccount> = {}): UserAccount {
  return {
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
    ...overrides,
  };
}

function record(
  overrides: Partial<GoogleAccountRecord> = {},
): GoogleAccountRecord {
  return {
    account: account(),
    googleId: null,
    emailVerified: true,
    ...overrides,
  };
}

describe('GoogleAuthenticationService', () => {
  let verifier: FakeGoogleIdentityVerifier;
  let store: InMemoryGoogleAuthenticationStore;
  let provisioner: FakeWorkspaceOwnerProvisioner;
  let credentials: InMemoryCredentialStore;
  let hasher: FakePasswordHasher;
  let service: GoogleAuthenticationService;

  beforeEach(() => {
    verifier = new FakeGoogleIdentityVerifier();
    store = new InMemoryGoogleAuthenticationStore();
    provisioner = new FakeWorkspaceOwnerProvisioner();
    credentials = new InMemoryCredentialStore();
    hasher = new FakePasswordHasher();
    service = new GoogleAuthenticationService(
      verifier,
      store,
      provisioner,
      credentials,
      hasher,
    );
  });

  it('provisions a verified passwordless workspace owner', async () => {
    verifier.identity = {
      googleId: 'google-1',
      email: 'new@example.com',
      firstName: 'Jan',
      lastName: 'Kowalski',
      hostedDomain: null,
    };

    const result = await service.signin('token');

    expect(provisioner.calls[0]).toMatchObject({
      email: 'new@example.com',
      googleId: 'google-1',
      firstName: 'Jan',
      lastName: 'Kowalski',
      emailVerifiedAt: expect.any(Date),
    });
    expect(result.hasPassword).toBe(false);
    expect(result).not.toHaveProperty('companyId');
    expect(result).not.toHaveProperty('role');
  });

  it('signs in an existing Google link', async () => {
    const existing = record({ googleId: 'google-1' });
    store.seed(existing);

    await expect(service.signin('token')).resolves.toBe(existing.account);
  });

  it.each([
    ['gmail', 'user@gmail.com', null],
    ['Google Workspace', 'user@example.com', 'example.com'],
  ])(
    'auto-links authoritative %s identity',
    async (_name, email, hostedDomain) => {
      verifier.identity = { ...verifier.identity, email, hostedDomain };
      const existing = record({ account: account({ email }) });
      store.seed(existing);

      await expect(service.signin('token')).resolves.toBe(existing.account);
      expect(existing.googleId).toBe('google-1');
    },
  );

  it('requires explicit link for a non-authoritative domain', async () => {
    store.seed(record());

    await expect(service.signin('token')).rejects.toBeInstanceOf(
      GoogleExplicitLinkRequiredError,
    );
  });

  it('rejects auto-link to an unverified local account', async () => {
    store.seed(record({ emailVerified: false }));

    await expect(service.signin('token')).rejects.toBeInstanceOf(
      GoogleEmailUnverifiedError,
    );
  });

  it('explicitly links matching identity with the current password', async () => {
    const passwordHash = await hasher.hash('secret');
    const existing = record();
    store.seed(existing);
    credentials.seed({
      ...existing.account,
      passwordHash,
      emailVerified: true,
      passwordVersion: 1,
      lastLoginAt: null,
    });

    await expect(
      service.link(existing.account.id, 'token', 'secret'),
    ).resolves.toEqual(existing.account);
    expect(existing.googleId).toBe('google-1');
    expect(store.linkCalls[0]).toEqual({
      email: existing.account.email,
      passwordHash,
    });
  });

  it('rejects explicit link with invalid password', async () => {
    const passwordHash = await hasher.hash('secret');
    const existing = record();
    store.seed(existing);
    credentials.seed({
      ...existing.account,
      passwordHash,
      emailVerified: true,
      passwordVersion: 1,
      lastLoginAt: null,
    });

    await expect(
      service.link(existing.account.id, 'token', 'wrong'),
    ).rejects.toBeInstanceOf(InvalidGoogleLinkCredentialsError);
  });

  it('rejects explicit link when Google and account emails differ', async () => {
    const passwordHash = await hasher.hash('secret');
    credentials.seed({
      ...account({ email: 'other@example.com' }),
      passwordHash,
      emailVerified: true,
      passwordVersion: 1,
      lastLoginAt: null,
    });

    await expect(
      service.link('user-1', 'token', 'secret'),
    ).rejects.toBeInstanceOf(InvalidGoogleLinkCredentialsError);
  });

  it('rejects a Google identity already linked to another account', async () => {
    const passwordHash = await hasher.hash('secret');
    store.seed(
      record({
        account: account({ id: 'other-user' }),
        googleId: 'google-1',
      }),
    );
    credentials.seed({
      ...account(),
      passwordHash,
      emailVerified: true,
      passwordVersion: 1,
      lastLoginAt: null,
    });

    await expect(
      service.link('user-1', 'token', 'secret'),
    ).rejects.toBeInstanceOf(GoogleAccountConflictError);
  });

  it('rejects a link when account state changes before CAS', async () => {
    const passwordHash = await hasher.hash('secret');
    const existing = record();
    store.seed(existing);
    credentials.seed({
      ...existing.account,
      passwordHash,
      emailVerified: true,
      passwordVersion: 1,
      lastLoginAt: null,
    });
    jest.spyOn(store, 'link').mockResolvedValue(false);

    await expect(
      service.link('user-1', 'token', 'secret'),
    ).rejects.toBeInstanceOf(GoogleLinkChangedError);
  });

  it('resolves concurrent provisioning of the same Google identity', async () => {
    const concurrent = record({
      account: account({ hasPassword: false }),
      googleId: 'google-1',
    });
    provisioner.error = new WorkspaceOwnerConflictError();
    jest
      .spyOn(store, 'findByGoogleId')
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(concurrent);

    await expect(service.signin('token')).resolves.toBe(concurrent.account);
  });
});
