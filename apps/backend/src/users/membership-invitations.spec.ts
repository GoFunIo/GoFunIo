import { ConflictException } from '@nestjs/common';
import type { EventEmitter2 } from '@nestjs/event-emitter';
import { Repository } from 'typeorm';
import { ConflictCode } from '../common/conflict';
import type { TransactionalVehicleAccess } from '../fleet/transactional-vehicle-access';
import type { NotificationChangeRelay } from '../notification-changes/notification-change-relay';
import { MEMBERSHIP_INVITATION_REQUESTED_EVENT } from './events/membership-invitation-requested.event';
import { Membership } from './membership.entity';
import { MembershipInvitationsService } from './membership-invitations.service';
import { MembershipRole } from './membership-role';
import { generateToken } from './token.util';
import { User } from './users.entity';
import type { PasswordRecoveryService } from './password-recovery.service';

jest.mock('./token.util', () => ({
  generateToken: jest.fn(),
  hashToken: jest.fn(),
}));

const generateTokenMock = generateToken as jest.Mock;
const companyId = 'company-1';
const origin = 'https://app.example.com';
const generated = {
  token: 'raw-token',
  tokenHash: 'hashed-token',
  expiresAt: new Date('2024-02-01T00:00:00Z'),
};

describe('MembershipInvitationsService invite', () => {
  beforeEach(() => {
    generateTokenMock.mockReset().mockReturnValue(generated);
  });

  it('creates a new user and a first-password invitation', async () => {
    const {
      manager,
      service,
      passwordRecovery,
      events,
      notificationRecipients,
    } = setup({ existingUser: undefined, existingMembership: null });

    await service.invite(
      companyId,
      'new@example.com',
      MembershipRole.MANAGER,
      origin,
    );

    expect(manager.create).toHaveBeenCalledWith(User, {
      email: 'new@example.com',
      password: null,
      googleId: null,
      emailVerifiedAt: null,
    });
    expect(manager.create).toHaveBeenCalledWith(Membership, {
      userId: 'id-1',
      companyId,
    });
    expect(manager.save).toHaveBeenCalledWith(
      expect.objectContaining({
        role: MembershipRole.MANAGER,
        status: 'pending',
        tokenHash: generated.tokenHash,
        tokenExpiresAt: generated.expiresAt,
      }),
    );
    expect(notificationRecipients.reconcileRecipients).toHaveBeenCalledWith(
      manager,
      { companyId, userIds: ['id-1'] },
    );
    expect(passwordRecovery.issueFirstPassword).toHaveBeenCalledWith(
      'id-1',
      origin,
      'id-2',
      7 * 24,
    );
    expect(events.emit).not.toHaveBeenCalled();
  });

  it('rejects when the account is soft-deleted', async () => {
    const { service } = setup({
      existingUser: {
        id: 'u1',
        deletedAt: new Date(),
        password: null,
        googleId: null,
        emailVerifiedAt: null,
      } as User,
      existingMembership: null,
    });

    let error: unknown;
    try {
      await service.invite(
        companyId,
        'gone@example.com',
        MembershipRole.MANAGER,
        origin,
      );
    } catch (caught) {
      error = caught;
    }

    expect(error).toBeInstanceOf(ConflictException);
    expect((error as ConflictException).getResponse()).toMatchObject({
      code: ConflictCode.ACCOUNT_UNAVAILABLE,
    });
  });

  it('emits an invitation event for an existing user with a password', async () => {
    const { manager, service, passwordRecovery, events } = setup({
      existingUser: {
        id: 'existing-1',
        email: 'existing@example.com',
        deletedAt: null,
        password: 'hash',
        googleId: null,
        emailVerifiedAt: null,
      } as User,
      existingMembership: null,
    });

    await service.invite(
      companyId,
      'existing@example.com',
      MembershipRole.ADMIN,
      origin,
    );

    expect(manager.create).not.toHaveBeenCalledWith(User, expect.anything());
    expect(passwordRecovery.issueFirstPassword).not.toHaveBeenCalled();
    expect(events.emit).toHaveBeenCalledWith(
      MEMBERSHIP_INVITATION_REQUESTED_EVENT,
      expect.objectContaining({
        delivery: {
          email: 'existing@example.com',
          token: generated.token,
          origin,
        },
      }),
    );
  });

  it('rejects when the user already has an active membership', async () => {
    const { service } = setup({
      existingUser: {
        id: 'existing-1',
        deletedAt: null,
        password: 'hash',
        googleId: null,
        emailVerifiedAt: null,
      } as User,
      existingMembership: {
        id: 'membership-1',
        status: 'active',
      } as Membership,
    });

    let error: unknown;
    try {
      await service.invite(
        companyId,
        'existing@example.com',
        MembershipRole.ADMIN,
        origin,
      );
    } catch (caught) {
      error = caught;
    }

    expect(error).toBeInstanceOf(ConflictException);
    expect((error as ConflictException).getResponse()).toMatchObject({
      code: ConflictCode.ALREADY_WORKSPACE_MEMBER,
    });
  });

  it('reuses a declined membership instead of creating a new one', async () => {
    const existingMembership = {
      id: 'membership-1',
      status: 'declined',
    } as Membership;
    const { manager, service } = setup({
      existingUser: {
        id: 'existing-1',
        deletedAt: null,
        password: 'hash',
        googleId: null,
        emailVerifiedAt: null,
      } as User,
      existingMembership,
    });

    await service.invite(
      companyId,
      'existing@example.com',
      MembershipRole.ADMIN,
      origin,
    );

    expect(manager.create).not.toHaveBeenCalledWith(
      Membership,
      expect.anything(),
    );
    expect(manager.save).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'membership-1',
        role: MembershipRole.ADMIN,
        status: 'pending',
      }),
    );
  });

  function setup(options: {
    existingUser: User | undefined;
    existingMembership: Membership | null;
  }) {
    const query = {
      withDeleted: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      setLock: jest.fn().mockReturnThis(),
      getOne: jest.fn().mockResolvedValue(options.existingUser),
    };
    let idCounter = 0;
    const manager = {
      query: jest.fn().mockResolvedValue(undefined),
      createQueryBuilder: jest.fn().mockReturnValue(query),
      findOne: jest.fn().mockResolvedValue(options.existingMembership),
      create: jest.fn((_entity: unknown, data?: object) => ({
        ...(data ?? {}),
      })),
      save: jest.fn((entity: Record<string, unknown>) => {
        entity.id ??= `id-${++idCounter}`;
        return Promise.resolve(entity);
      }),
    };
    const memberships = {
      manager: {
        transaction: jest.fn(
          async (callback: (value: typeof manager) => Promise<unknown>) =>
            callback(manager),
        ),
      },
    };
    const events = { emit: jest.fn() };
    const passwordRecovery = {
      issueFirstPassword: jest.fn().mockResolvedValue(undefined),
    };
    const vehicleAccess = { closeManager: jest.fn() };
    const notificationRecipients = {
      reconcileRecipients: jest.fn().mockResolvedValue(undefined),
    };
    const notificationChanges = {
      record: jest.fn().mockResolvedValue(undefined),
    };
    const service = new MembershipInvitationsService(
      memberships as unknown as Repository<Membership>,
      events as unknown as EventEmitter2,
      passwordRecovery as unknown as PasswordRecoveryService,
      vehicleAccess as unknown as TransactionalVehicleAccess,
      notificationRecipients,
      notificationChanges as unknown as NotificationChangeRelay,
    );
    return {
      manager,
      service,
      passwordRecovery,
      events,
      notificationRecipients,
    };
  }
});
