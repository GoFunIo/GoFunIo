import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { Repository } from 'typeorm';
import type { TransactionalVehicleAccess } from '../fleet/transactional-vehicle-access';
import { CompanyUsersService } from './company-users.service';
import { Membership } from './membership.entity';
import { MembershipRole } from './membership-role';
import type { NotificationChangeRelay } from '../notification-changes/notification-change-relay';
import { PasswordRecoveryService } from './password-recovery.service';
import { User } from './users.entity';

describe('CompanyUsersService membership rules', () => {
  const companyId = 'company-1';
  const adminId = 'admin-1';
  const managerId = 'manager-1';

  it('allows a manager to leave and closes vehicle access', async () => {
    const target = user(managerId);
    const { manager, service, vehicleAccess } = setup(
      [membership(managerId, MembershipRole.MANAGER)],
      target,
    );

    await service.leave({
      id: managerId,
      companyId,
      role: MembershipRole.MANAGER,
    });

    expect(manager.save).toHaveBeenCalledWith(
      expect.objectContaining({ userId: managerId, status: 'removed' }),
    );
    expect(manager.softDelete).toHaveBeenCalledWith(
      expect.anything(),
      companyId,
    );
    expect(vehicleAccess.closeManager).toHaveBeenCalledWith(
      manager,
      companyId,
      managerId,
    );
  });

  it('blocks the owner from leaving', async () => {
    const { service } = setup(
      [membership(adminId, MembershipRole.OWNER)],
      user(adminId),
    );

    await expect(
      service.leave({
        id: adminId,
        companyId,
        role: MembershipRole.OWNER,
      }),
    ).rejects.toThrow(
      new ConflictException(
        'Transfer ownership or delete the company before leaving',
      ),
    );
  });

  it('blocks admin self-removal and self-demotion', async () => {
    const { service } = setup([], user(adminId));
    const actor = {
      id: adminId,
      companyId,
      role: MembershipRole.ADMIN,
    };

    await expect(service.remove(actor, adminId)).rejects.toThrow(
      new ConflictException('Cannot delete yourself'),
    );
    await expect(
      service.update(actor, adminId, { role: MembershipRole.MANAGER }),
    ).rejects.toThrow(new ConflictException('Cannot demote yourself'));
  });

  it('rejects empty updates', async () => {
    const { service } = setup([], user(adminId));
    await expect(
      service.update(
        { id: adminId, companyId, role: MembershipRole.ADMIN },
        managerId,
        {},
      ),
    ).rejects.toThrow(new BadRequestException('No changes provided'));
  });

  it('rejects an actor whose admin membership was revoked', async () => {
    const { service } = setup([], user(managerId));

    await expect(
      service.update(
        { id: adminId, companyId, role: MembershipRole.ADMIN },
        managerId,
        { firstName: 'Blocked' },
      ),
    ).rejects.toThrow(ForbiddenException);
  });

  it('blocks an admin from changing the owner', async () => {
    const ownerId = 'owner-1';
    const { service } = setup(
      [
        membership(ownerId, MembershipRole.OWNER),
        membership(adminId, MembershipRole.ADMIN),
      ],
      user(ownerId),
    );

    await expect(
      service.update(
        { id: adminId, companyId, role: MembershipRole.ADMIN },
        ownerId,
        { firstName: 'Blocked' },
      ),
    ).rejects.toThrow(ForbiddenException);
  });

  it('transfers ownership from the owner to an active admin', async () => {
    const ownerId = 'owner-1';
    const owner = membership(ownerId, MembershipRole.OWNER);
    const admin = membership(adminId, MembershipRole.ADMIN);
    const { manager, service } = setup([owner, admin], user(adminId));

    await service.transferOwnership(
      { id: ownerId, companyId, role: MembershipRole.OWNER },
      adminId,
    );

    expect(owner.role).toBe(MembershipRole.ADMIN);
    expect(admin.role).toBe(MembershipRole.OWNER);
    expect(manager.save).toHaveBeenNthCalledWith(1, owner);
    expect(manager.save).toHaveBeenNthCalledWith(2, admin);
  });

  it('updates profile fields without a role change or notification reconciliation', async () => {
    const target = user(managerId);
    const {
      service,
      notificationRecipients,
      notificationChanges,
      vehicleAccess,
    } = setup(
      [
        membership(adminId, MembershipRole.ADMIN),
        membership(managerId, MembershipRole.MANAGER),
      ],
      target,
    );

    const result = await service.update(
      { id: adminId, companyId, role: MembershipRole.ADMIN },
      managerId,
      { firstName: 'Updated' },
    );

    expect(result.firstName).toBe('Updated');
    expect(result.role).toBe(MembershipRole.MANAGER);
    expect(notificationRecipients.reconcileRecipients).not.toHaveBeenCalled();
    expect(notificationChanges.record).not.toHaveBeenCalled();
    expect(vehicleAccess.closeManager).not.toHaveBeenCalled();
  });

  it('promotes a manager to admin and closes their manager vehicle access', async () => {
    const managerMembership = membership(managerId, MembershipRole.MANAGER);
    const {
      service,
      manager,
      notificationRecipients,
      notificationChanges,
      vehicleAccess,
    } = setup(
      [membership(adminId, MembershipRole.ADMIN), managerMembership],
      user(managerId),
    );

    const result = await service.update(
      { id: adminId, companyId, role: MembershipRole.ADMIN },
      managerId,
      { role: MembershipRole.ADMIN },
    );

    expect(result.role).toBe(MembershipRole.ADMIN);
    expect(managerMembership.role).toBe(MembershipRole.ADMIN);
    expect(manager.save).toHaveBeenCalledWith(managerMembership);
    expect(vehicleAccess.closeManager).toHaveBeenCalledWith(
      manager,
      companyId,
      managerId,
    );
    expect(notificationRecipients.reconcileRecipients).toHaveBeenCalledWith(
      manager,
      { companyId, userIds: [managerId] },
    );
    expect(notificationChanges.record).toHaveBeenCalledWith(manager, {
      companyId,
      userId: managerId,
    });
  });

  it('changes a role without manager cleanup when the member was not a manager', async () => {
    const targetMembership = membership(managerId, MembershipRole.ADMIN);
    const {
      service,
      notificationRecipients,
      notificationChanges,
      vehicleAccess,
    } = setup(
      [membership(adminId, MembershipRole.ADMIN), targetMembership],
      user(managerId),
    );

    await service.update(
      { id: adminId, companyId, role: MembershipRole.ADMIN },
      managerId,
      { role: MembershipRole.MANAGER },
    );

    expect(targetMembership.role).toBe(MembershipRole.MANAGER);
    expect(vehicleAccess.closeManager).not.toHaveBeenCalled();
    expect(notificationRecipients.reconcileRecipients).toHaveBeenCalledWith(
      expect.anything(),
      { companyId, userIds: [managerId] },
    );
    expect(notificationChanges.record).toHaveBeenCalled();
  });

  it('allows the owner to update their own profile without a role change', async () => {
    const ownerId = 'owner-1';
    const { service } = setup(
      [membership(ownerId, MembershipRole.OWNER)],
      user(ownerId),
    );

    const result = await service.update(
      { id: ownerId, companyId, role: MembershipRole.OWNER },
      ownerId,
      { firstName: 'Owner' },
    );

    expect(result.firstName).toBe('Owner');
    expect(result.role).toBe(MembershipRole.OWNER);
  });

  it('removes another member and keeps the company when members remain', async () => {
    const { manager, service, vehicleAccess } = setup(
      [
        membership(adminId, MembershipRole.ADMIN),
        membership(managerId, MembershipRole.MANAGER),
      ],
      user(managerId),
      { companyStillActive: true },
    );

    await service.remove(
      { id: adminId, companyId, role: MembershipRole.ADMIN },
      managerId,
    );

    expect(manager.save).toHaveBeenCalledWith(
      expect.objectContaining({ userId: managerId, status: 'removed' }),
    );
    expect(vehicleAccess.closeManager).toHaveBeenCalledWith(
      manager,
      companyId,
      managerId,
    );
    expect(manager.softDelete).not.toHaveBeenCalled();
  });

  it('blocks removing the owner', async () => {
    const ownerId = 'owner-1';
    const { service } = setup(
      [
        membership(ownerId, MembershipRole.OWNER),
        membership(adminId, MembershipRole.ADMIN),
      ],
      user(ownerId),
    );

    await expect(
      service.remove(
        { id: adminId, companyId, role: MembershipRole.ADMIN },
        ownerId,
      ),
    ).rejects.toThrow(ForbiddenException);
  });

  it('removes a non-manager without touching vehicle access', async () => {
    const targetMembership = membership(adminId, MembershipRole.ADMIN);
    const { vehicleAccess, service } = setup(
      [
        membership('actor-admin', MembershipRole.ADMIN),
        targetMembership,
      ],
      user(adminId),
      { companyStillActive: true },
    );

    await service.remove(
      { id: 'actor-admin', companyId, role: MembershipRole.ADMIN },
      adminId,
    );

    expect(vehicleAccess.closeManager).not.toHaveBeenCalled();
  });

  it('leaves the company active when a non-manager leaves', async () => {
    const { vehicleAccess, manager, service } = setup(
      [membership(adminId, MembershipRole.ADMIN)],
      user(adminId),
      { companyStillActive: true },
    );

    await service.leave({ id: adminId, companyId, role: MembershipRole.ADMIN });

    expect(vehicleAccess.closeManager).not.toHaveBeenCalled();
    expect(manager.softDelete).not.toHaveBeenCalled();
  });

  it('rejects a target id with no active membership', async () => {
    const { service } = setup(
      [membership(adminId, MembershipRole.ADMIN)],
      user(adminId),
    );

    await expect(
      service.update(
        { id: adminId, companyId, role: MembershipRole.ADMIN },
        'missing-user',
        { firstName: 'X' },
      ),
    ).rejects.toThrow('User not found');
  });

  it('rejects when the membership exists but the user record is gone', async () => {
    const { service } = setup(
      [
        membership(adminId, MembershipRole.ADMIN),
        membership(managerId, MembershipRole.MANAGER),
      ],
      null,
    );

    await expect(
      service.update(
        { id: adminId, companyId, role: MembershipRole.ADMIN },
        managerId,
        { firstName: 'X' },
      ),
    ).rejects.toThrow('User not found');
  });

  it('rejects an actor with an active but non-admin membership', async () => {
    const { service } = setup(
      [
        membership(managerId, MembershipRole.MANAGER),
        membership(adminId, MembershipRole.ADMIN),
      ],
      user(adminId),
    );

    await expect(
      service.update(
        { id: managerId, companyId, role: MembershipRole.MANAGER },
        adminId,
        { firstName: 'X' },
      ),
    ).rejects.toThrow(ForbiddenException);
  });

  it('rejects transferOwnership when the actor has no active membership', async () => {
    const ownerId = 'owner-1';
    const { service } = setup(
      [membership(adminId, MembershipRole.ADMIN)],
      user(adminId),
    );

    await expect(
      service.transferOwnership(
        { id: ownerId, companyId, role: MembershipRole.OWNER },
        adminId,
      ),
    ).rejects.toThrow(ForbiddenException);
  });

  it('rejects transferOwnership from a non-owner actor', async () => {
    const ownerId = 'owner-1';
    const { service } = setup(
      [
        membership(ownerId, MembershipRole.OWNER),
        membership(adminId, MembershipRole.ADMIN),
      ],
      user(adminId),
    );

    await expect(
      service.transferOwnership(
        { id: adminId, companyId, role: MembershipRole.ADMIN },
        ownerId,
      ),
    ).rejects.toThrow(ForbiddenException);
  });

  it('rejects transferOwnership to a target who is not an active admin', async () => {
    const ownerId = 'owner-1';
    const { service } = setup(
      [
        membership(ownerId, MembershipRole.OWNER),
        membership(managerId, MembershipRole.MANAGER),
      ],
      user(managerId),
    );

    await expect(
      service.transferOwnership(
        { id: ownerId, companyId, role: MembershipRole.OWNER },
        managerId,
      ),
    ).rejects.toThrow(
      new ConflictException('Ownership requires an active admin'),
    );
  });

  it('rejects an owner role change attempted with a stale session role', async () => {
    const ownerId = 'owner-1';
    const { service } = setup(
      [membership(ownerId, MembershipRole.OWNER)],
      user(ownerId),
    );

    await expect(
      service.update(
        { id: ownerId, companyId, role: MembershipRole.ADMIN },
        ownerId,
        { role: MembershipRole.ADMIN },
      ),
    ).rejects.toThrow(new ConflictException('Transfer ownership first'));
  });

  function setup(
    activeMemberships: Membership[],
    target: User | null,
    options: { companyStillActive?: boolean } = {},
  ) {
    const query = {
      innerJoin: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      setLock: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue(activeMemberships),
    };
    const manager = {
      createQueryBuilder: jest.fn().mockReturnValue(query),
      findOne: jest.fn().mockResolvedValue(target),
      save: jest.fn().mockImplementation((value) => Promise.resolve(value)),
      exists: jest.fn().mockResolvedValue(options.companyStillActive ?? false),
      softDelete: jest.fn().mockResolvedValue(undefined),
      update: jest.fn().mockResolvedValue(undefined),
    };
    const repository = {
      manager: {
        transaction: jest.fn(
          async (callback: (value: typeof manager) => Promise<unknown>) =>
            callback(manager),
        ),
      },
    };
    const closeManager = jest.fn();
    const vehicleAccess = { closeManager };
    const notificationRecipients = { reconcileRecipients: jest.fn() };
    const notificationChanges = { record: jest.fn() };
    const service = new CompanyUsersService(
      repository as unknown as Repository<User>,
      { issueFirstPassword: jest.fn() } as unknown as PasswordRecoveryService,
      vehicleAccess as unknown as TransactionalVehicleAccess,
      notificationRecipients,
      notificationChanges as unknown as NotificationChangeRelay,
    );
    return {
      manager,
      service,
      vehicleAccess,
      notificationRecipients,
      notificationChanges,
    };
  }

  function membership(userId: string, role: MembershipRole): Membership {
    return {
      id: `membership-${userId}`,
      userId,
      companyId,
      role,
      status: 'active',
      tokenHash: null,
      tokenExpiresAt: null,
    } as Membership;
  }

  function user(id: string): User {
    return { id, email: `${id}@example.com` } as User;
  }
});
