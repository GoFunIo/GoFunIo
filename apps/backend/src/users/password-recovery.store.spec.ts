import { Repository } from 'typeorm';
import { Membership } from './membership.entity';
import {
  InMemoryPasswordRecoveryStore,
  TypeOrmPasswordRecoveryStore,
} from './password-recovery.store';
import { User } from './users.entity';

const tokenHash = 'token-hash';
const passwordHash = 'new-password-hash';
const now = new Date('2024-01-01T00:00:00Z');
const expiresAt = new Date('2024-01-02T00:00:00Z');

describe('TypeOrmPasswordRecoveryStore consume', () => {
  it('returns false when no matching reset token exists', async () => {
    const { store } = setup({ user: undefined });

    await expect(store.consume(tokenHash, passwordHash, now)).resolves.toBe(
      false,
    );
  });

  it('sets a new password when the account already has one', async () => {
    const { store, manager } = setup({
      user: {
        id: 'u1',
        password: 'old-hash',
        emailVerifiedAt: new Date('2023-01-01T00:00:00Z'),
      } as User,
    });

    await expect(store.consume(tokenHash, passwordHash, now)).resolves.toBe(
      true,
    );

    expect(manager.update).toHaveBeenCalledWith(
      User,
      { id: 'u1', passwordResetTokenHash: tokenHash },
      expect.objectContaining({
        password: passwordHash,
        emailVerifiedAt: new Date('2023-01-01T00:00:00Z'),
        passwordResetTokenHash: null,
        passwordResetTokenExpiresAt: null,
      }),
    );
    expect(manager.createQueryBuilder).not.toHaveBeenCalledWith(
      Membership,
      expect.anything(),
    );
  });

  it('activates a pending invitation on first password', async () => {
    const { store, manager, notificationRecipients } = setup({
      user: { id: 'u1', password: null, emailVerifiedAt: null } as User,
      invitation: { id: 'inv1', companyId: 'company-1' } as Membership,
    });

    await expect(store.consume(tokenHash, passwordHash, now)).resolves.toBe(
      true,
    );

    expect(manager.update).toHaveBeenCalledWith(
      User,
      { id: 'u1', passwordResetTokenHash: tokenHash },
      expect.objectContaining({ emailVerifiedAt: now }),
    );
    expect(manager.update).toHaveBeenCalledWith(
      Membership,
      { id: 'inv1', status: 'pending', tokenHash },
      { status: 'active', tokenHash: null, tokenExpiresAt: null },
    );
    expect(notificationRecipients.reconcileRecipients).toHaveBeenCalledWith(
      manager,
      { companyId: 'company-1', userIds: ['u1'] },
    );
  });

  it('returns true for a first password with no matching invitation', async () => {
    const { store, notificationRecipients } = setup({
      user: { id: 'u1', password: null, emailVerifiedAt: null } as User,
      invitation: undefined,
    });

    await expect(store.consume(tokenHash, passwordHash, now)).resolves.toBe(
      true,
    );
    expect(notificationRecipients.reconcileRecipients).not.toHaveBeenCalled();
  });

  it('returns false without activating anything when the reset update loses the race', async () => {
    const { store, notificationRecipients } = setup({
      user: { id: 'u1', password: null, emailVerifiedAt: null } as User,
      invitation: { id: 'inv1', companyId: 'company-1' } as Membership,
      userUpdateAffected: 0,
    });

    await expect(store.consume(tokenHash, passwordHash, now)).resolves.toBe(
      false,
    );
    expect(notificationRecipients.reconcileRecipients).not.toHaveBeenCalled();
  });

  it('returns false without reconciling recipients when the invitation activation loses the race', async () => {
    const { store, notificationRecipients } = setup({
      user: { id: 'u1', password: null, emailVerifiedAt: null } as User,
      invitation: { id: 'inv1', companyId: 'company-1' } as Membership,
      membershipUpdateAffected: 0,
    });

    await expect(store.consume(tokenHash, passwordHash, now)).resolves.toBe(
      false,
    );
    expect(notificationRecipients.reconcileRecipients).not.toHaveBeenCalled();
  });

  function setup(options: {
    user: User | undefined;
    invitation?: Membership | undefined;
    userUpdateAffected?: number;
    membershipUpdateAffected?: number;
  }) {
    const userQuery = {
      addSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      setLock: jest.fn().mockReturnThis(),
      getOne: jest.fn().mockResolvedValue(options.user),
    };
    const membershipQuery = {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      setLock: jest.fn().mockReturnThis(),
      getOne: jest.fn().mockResolvedValue(options.invitation),
    };
    const manager = {
      createQueryBuilder: jest.fn((entity: unknown) =>
        entity === Membership ? membershipQuery : userQuery,
      ),
      update: jest.fn((entity: unknown) =>
        Promise.resolve({
          affected:
            entity === User
              ? (options.userUpdateAffected ?? 1)
              : (options.membershipUpdateAffected ?? 1),
        }),
      ),
    };
    const users = {
      manager: {
        transaction: jest.fn(
          async (callback: (value: typeof manager) => Promise<unknown>) =>
            callback(manager),
        ),
      },
    };
    const notificationRecipients = {
      reconcileRecipients: jest.fn().mockResolvedValue(undefined),
    };
    const store = new TypeOrmPasswordRecoveryStore(
      users as unknown as Repository<User>,
      notificationRecipients,
    );
    return { store, manager, notificationRecipients };
  }
});

describe('TypeOrmPasswordRecoveryStore assignByEmail', () => {
  it('returns the recovery target for a matching account', async () => {
    const { store, builder } = setup([
      { id: 'u1', email: 'a@b.com', password: 'hash' },
    ]);

    await expect(
      store.assignByEmail('a@b.com', tokenHash, expiresAt),
    ).resolves.toEqual({
      userId: 'u1',
      email: 'a@b.com',
      isFirstPassword: false,
    });
    expect(builder.andWhere).toHaveBeenCalledTimes(1);
  });

  it('returns null when no account matches', async () => {
    const { store } = setup([]);

    await expect(
      store.assignByEmail('missing@b.com', tokenHash, expiresAt),
    ).resolves.toBeNull();
  });

  function setup(raw: unknown[]) {
    const builder = assignQueryBuilder(raw);
    const users = { createQueryBuilder: jest.fn().mockReturnValue(builder) };
    const store = new TypeOrmPasswordRecoveryStore(
      users as unknown as Repository<User>,
      { reconcileRecipients: jest.fn() },
    );
    return { store, builder };
  }
});

describe('TypeOrmPasswordRecoveryStore assignFirstPassword', () => {
  it('links a pending invitation to the first-password reset', async () => {
    const { store, manager } = setup({
      raw: [{ id: 'u1', email: 'a@b.com', password: null }],
    });

    await expect(
      store.assignFirstPassword('u1', tokenHash, expiresAt, 'inv1'),
    ).resolves.toEqual({
      userId: 'u1',
      email: 'a@b.com',
      isFirstPassword: true,
    });
    expect(manager.update).toHaveBeenCalledWith(
      Membership,
      { id: 'inv1', userId: 'u1', status: 'pending' },
      { tokenHash, tokenExpiresAt: expiresAt },
    );
  });

  it('throws when the invitation link loses the race', async () => {
    const { store } = setup({
      raw: [{ id: 'u1', email: 'a@b.com', password: null }],
      membershipAffected: 0,
    });

    await expect(
      store.assignFirstPassword('u1', tokenHash, expiresAt, 'inv1'),
    ).rejects.toThrow('Cannot link first password to invitation');
  });

  it('returns null without touching a membership when the account is not eligible', async () => {
    const { store, manager } = setup({ raw: [] });

    await expect(
      store.assignFirstPassword('u1', tokenHash, expiresAt, 'inv1'),
    ).resolves.toBeNull();
    expect(manager.update).not.toHaveBeenCalled();
  });

  it('does not require a membership id', async () => {
    const { store, manager } = setup({
      raw: [{ id: 'u1', email: 'a@b.com', password: null }],
    });

    await expect(
      store.assignFirstPassword('u1', tokenHash, expiresAt),
    ).resolves.toEqual({
      userId: 'u1',
      email: 'a@b.com',
      isFirstPassword: true,
    });
    expect(manager.update).not.toHaveBeenCalled();
  });

  function setup(options: { raw: unknown[]; membershipAffected?: number }) {
    const builder = assignQueryBuilder(options.raw);
    const repository = {
      createQueryBuilder: jest.fn().mockReturnValue(builder),
    };
    const manager = {
      getRepository: jest.fn().mockReturnValue(repository),
      update: jest
        .fn()
        .mockResolvedValue({ affected: options.membershipAffected ?? 1 }),
    };
    const users = {
      manager: {
        transaction: jest.fn(
          async (callback: (value: typeof manager) => Promise<unknown>) =>
            callback(manager),
        ),
      },
    };
    const store = new TypeOrmPasswordRecoveryStore(
      users as unknown as Repository<User>,
      { reconcileRecipients: jest.fn() },
    );
    return { store, manager };
  }
});

describe('InMemoryPasswordRecoveryStore', () => {
  it('assignByEmail ignores a matching but inactive account', async () => {
    const store = new InMemoryPasswordRecoveryStore();
    store.seed({
      id: 'u1',
      email: 'a@b.com',
      passwordHash: 'hash',
      emailVerifiedAt: null,
      passwordVersion: 0,
      active: false,
    });

    await expect(
      store.assignByEmail('a@b.com', tokenHash, expiresAt),
    ).resolves.toBeNull();
  });

  it('assignByEmail returns null when no account matches the email', async () => {
    const store = new InMemoryPasswordRecoveryStore();
    store.seed({
      id: 'u1',
      email: 'a@b.com',
      passwordHash: 'hash',
      emailVerifiedAt: null,
      passwordVersion: 0,
    });

    await expect(
      store.assignByEmail('missing@b.com', tokenHash, expiresAt),
    ).resolves.toBeNull();
  });

  it('assignFirstPassword returns null for an unknown user id', async () => {
    const store = new InMemoryPasswordRecoveryStore();

    await expect(
      store.assignFirstPassword('no-such-user', tokenHash, expiresAt),
    ).resolves.toBeNull();
  });

  it('assignFirstPassword refuses an inactive account', async () => {
    const store = new InMemoryPasswordRecoveryStore();
    store.seed({
      id: 'u1',
      email: 'a@b.com',
      passwordHash: null,
      emailVerifiedAt: null,
      passwordVersion: 0,
      active: false,
    });

    await expect(
      store.assignFirstPassword('u1', tokenHash, expiresAt),
    ).resolves.toBeNull();
  });

  it('assignFirstPassword refuses an account that already has a password', async () => {
    const store = new InMemoryPasswordRecoveryStore();
    store.seed({
      id: 'u1',
      email: 'a@b.com',
      passwordHash: 'existing-hash',
      emailVerifiedAt: null,
      passwordVersion: 0,
    });

    await expect(
      store.assignFirstPassword('u1', tokenHash, expiresAt),
    ).resolves.toBeNull();
  });

  it('consume rejects a reset for an account deactivated after the token was issued', async () => {
    const store = new InMemoryPasswordRecoveryStore();
    store.seed({
      id: 'u1',
      email: 'a@b.com',
      passwordHash: 'old-hash',
      emailVerifiedAt: new Date('2023-01-01T00:00:00Z'),
      passwordVersion: 0,
    });
    await store.assignByEmail('a@b.com', tokenHash, expiresAt);
    // deactivated after the token was already issued, while it's still live
    store.get('u1')!.active = false;

    await expect(
      store.consume(tokenHash, passwordHash, now),
    ).resolves.toBe(false);
  });

  it('assigning a new token invalidates the previous one', async () => {
    const store = new InMemoryPasswordRecoveryStore();
    store.seed({
      id: 'u1',
      email: 'a@b.com',
      passwordHash: 'old-hash',
      emailVerifiedAt: new Date('2023-01-01T00:00:00Z'),
      passwordVersion: 0,
    });
    await store.assignByEmail('a@b.com', 'first-token', expiresAt);
    await store.assignByEmail('a@b.com', 'second-token', expiresAt);

    await expect(
      store.consume('first-token', passwordHash, now),
    ).resolves.toBe(false);
    await expect(
      store.consume('second-token', passwordHash, now),
    ).resolves.toBe(true);
  });

  it('consume rejects a token that has already expired', async () => {
    const store = new InMemoryPasswordRecoveryStore();
    store.seed({
      id: 'u1',
      email: 'a@b.com',
      passwordHash: 'old-hash',
      emailVerifiedAt: new Date('2023-01-01T00:00:00Z'),
      passwordVersion: 0,
    });
    await store.assignByEmail('a@b.com', tokenHash, expiresAt);

    await expect(
      store.consume(tokenHash, passwordHash, expiresAt),
    ).resolves.toBe(false);
  });

  it('consume sets emailVerifiedAt on a first-password reset but leaves it untouched otherwise', async () => {
    const store = new InMemoryPasswordRecoveryStore();
    store.seed({
      id: 'first',
      email: 'first@b.com',
      passwordHash: null,
      emailVerifiedAt: null,
      passwordVersion: 0,
    });
    store.seed({
      id: 'returning',
      email: 'returning@b.com',
      passwordHash: 'old-hash',
      emailVerifiedAt: new Date('2023-01-01T00:00:00Z'),
      passwordVersion: 0,
    });
    await store.assignFirstPassword('first', 'first-token', expiresAt);
    await store.assignByEmail('returning@b.com', 'returning-token', expiresAt);

    await store.consume('first-token', passwordHash, now);
    await store.consume('returning-token', passwordHash, now);

    expect(store.get('first')!.emailVerifiedAt).toEqual(now);
    expect(store.get('returning')!.emailVerifiedAt).toEqual(
      new Date('2023-01-01T00:00:00Z'),
    );
  });
});

function assignQueryBuilder(raw: unknown[]) {
  return {
    update: jest.fn().mockReturnThis(),
    set: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    returning: jest.fn().mockReturnThis(),
    execute: jest.fn().mockResolvedValue({ raw }),
  };
}
