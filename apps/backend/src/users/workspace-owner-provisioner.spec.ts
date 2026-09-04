import { QueryFailedError, Repository } from 'typeorm';
import type { Clock } from '../common/clock';
import { assertEmailClaimable } from './email-claim.util';
import { MembershipRole } from './membership-role';
import { User } from './users.entity';
import {
  TypeOrmWorkspaceOwnerProvisioner,
  WorkspaceOwnerConflictError,
} from './workspace-owner-provisioner';

jest.mock('./email-claim.util', () => ({
  assertEmailClaimable: jest.fn().mockResolvedValue(undefined),
}));

const assertEmailClaimableMock = assertEmailClaimable as jest.Mock;
const now = new Date('2024-01-01T00:00:00Z');

describe('TypeOrmWorkspaceOwnerProvisioner', () => {
  beforeEach(() => {
    assertEmailClaimableMock.mockReset().mockResolvedValue(undefined);
  });

  it('provisions a new company and owner for an email signup', async () => {
    const { manager, provisioner } = setup({ existing: undefined });

    const account = await provisioner.provision({
      email: 'owner@example.com',
      passwordHash: 'hash',
      verificationTokenHash: 'token-hash',
      verificationTokenExpiresAt: now,
    });

    expect(account.hasPassword).toBe(true);
    expect(manager.create).toHaveBeenCalledWith(User);
    expect(manager.save).toHaveBeenCalledWith(
      expect.objectContaining({
        role: MembershipRole.OWNER,
        userId: account.id,
      }),
    );
    expect(assertEmailClaimableMock).toHaveBeenCalledWith(
      manager,
      'owner@example.com',
      expect.any(Function),
      undefined,
    );
  });

  it('provisions a new company and owner for a google signup', async () => {
    const { manager, provisioner } = setup({ existing: undefined });

    const account = await provisioner.provision({
      email: 'owner@example.com',
      googleId: 'google-1',
      firstName: 'Ann',
      lastName: 'Nowak',
      emailVerifiedAt: now,
    });

    expect(account.hasPassword).toBe(false);
    expect(account.firstName).toBe('Ann');
    expect(account.lastName).toBe('Nowak');
    expect(manager.create).toHaveBeenCalledWith(User);
  });

  it('reuses a pending invitation reservation instead of creating a new user', async () => {
    const existing = {
      id: 'invited-user',
      deletedAt: null,
      password: null,
      googleId: null,
      emailVerifiedAt: null,
    } as User;
    const { manager, provisioner } = setup({
      existing,
      pendingMembership: true,
      activeMembership: false,
    });

    const account = await provisioner.provision({
      email: 'owner@example.com',
      passwordHash: 'hash',
      verificationTokenHash: 'token-hash',
      verificationTokenExpiresAt: now,
    });

    expect(account.id).toBe('invited-user');
    expect(manager.create).not.toHaveBeenCalledWith(User);
    expect(assertEmailClaimableMock).toHaveBeenCalledWith(
      manager,
      'owner@example.com',
      expect.any(Function),
      'invited-user',
    );
  });

  it('does not reuse an account that already holds an active membership', async () => {
    const existing = {
      id: 'active-user',
      deletedAt: null,
      password: null,
      googleId: null,
      emailVerifiedAt: null,
    } as User;
    const { manager, provisioner } = setup({
      existing,
      pendingMembership: true,
      activeMembership: true,
    });

    await provisioner.provision({
      email: 'owner@example.com',
      passwordHash: 'hash',
      verificationTokenHash: 'token-hash',
      verificationTokenExpiresAt: now,
    });

    expect(manager.create).toHaveBeenCalledWith(User);
    expect(assertEmailClaimableMock).toHaveBeenCalledWith(
      manager,
      'owner@example.com',
      expect.any(Function),
      undefined,
    );
  });

  it('rejects when the email is already claimed', async () => {
    assertEmailClaimableMock.mockRejectedValue(
      new WorkspaceOwnerConflictError(),
    );
    const { provisioner } = setup({ existing: undefined });

    await expect(
      provisioner.provision({
        email: 'owner@example.com',
        passwordHash: 'hash',
        verificationTokenHash: 'token-hash',
        verificationTokenExpiresAt: now,
      }),
    ).rejects.toThrow(WorkspaceOwnerConflictError);
  });

  it.each(['IDX_users_email', 'IDX_users_googleId'])(
    'translates a %s unique violation into a conflict',
    async (constraint) => {
      const { provisioner, repository } = setup({ existing: undefined });
      repository.manager.transaction.mockRejectedValue(
        new QueryFailedError('insert', [], {
          code: '23505',
          constraint,
        } as never),
      );

      await expect(
        provisioner.provision({
          email: 'owner@example.com',
          passwordHash: 'hash',
          verificationTokenHash: 'token-hash',
          verificationTokenExpiresAt: now,
        }),
      ).rejects.toThrow(WorkspaceOwnerConflictError);
    },
  );

  it('rethrows unrelated database errors', async () => {
    const { provisioner, repository } = setup({ existing: undefined });
    const dbError = new QueryFailedError('insert', [], {
      code: '23505',
      constraint: 'IDX_some_other_index',
    } as never);
    repository.manager.transaction.mockRejectedValue(dbError);

    await expect(
      provisioner.provision({
        email: 'owner@example.com',
        passwordHash: 'hash',
        verificationTokenHash: 'token-hash',
        verificationTokenExpiresAt: now,
      }),
    ).rejects.toBe(dbError);
  });

  function setup(options: {
    existing: User | undefined;
    pendingMembership?: boolean;
    activeMembership?: boolean;
  }) {
    const query = {
      withDeleted: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      getOne: jest.fn().mockResolvedValue(options.existing),
    };
    let idCounter = 0;
    const manager = {
      query: jest.fn().mockResolvedValue(undefined),
      createQueryBuilder: jest.fn().mockReturnValue(query),
      exists: jest
        .fn()
        .mockResolvedValueOnce(options.pendingMembership ?? false)
        .mockResolvedValueOnce(options.activeMembership ?? false),
      create: jest.fn((_entity: unknown, data?: object) => ({
        ...(data ?? {}),
      })),
      save: jest.fn((entity: Record<string, unknown>) =>
        Promise.resolve({ id: `generated-${++idCounter}`, ...entity }),
      ),
    };
    const repository = {
      manager: {
        transaction: jest.fn(
          async (callback: (value: typeof manager) => Promise<unknown>) =>
            callback(manager),
        ),
      },
    };
    const clock: Clock = { now: () => now };
    const provisioner = new TypeOrmWorkspaceOwnerProvisioner(
      repository as unknown as Repository<User>,
      clock,
    );
    return { manager, provisioner, repository };
  }
});
