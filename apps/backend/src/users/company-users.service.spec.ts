import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { Repository } from 'typeorm';
import type { VehicleAccess } from '../fleet/vehicle-access';
import { CompanyUsersService } from './company-users.service';
import { Membership } from './membership.entity';
import { MembershipRole } from './membership-role';
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
      companyId,
      managerId,
    );
  });

  it('blocks the sole admin from leaving', async () => {
    const { service } = setup(
      [membership(adminId, MembershipRole.ADMIN)],
      user(adminId),
    );

    await expect(
      service.leave({
        id: adminId,
        companyId,
        role: MembershipRole.ADMIN,
      }),
    ).rejects.toThrow(
      new ConflictException(
        'Promote another admin or delete the company before leaving',
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

  function setup(activeMemberships: Membership[], target: User) {
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
      exists: jest.fn().mockResolvedValue(false),
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
    const vehicleAccess = { closeManager: jest.fn() };
    const service = new CompanyUsersService(
      repository as unknown as Repository<User>,
      { issueFirstPassword: jest.fn() } as unknown as PasswordRecoveryService,
      vehicleAccess as unknown as VehicleAccess,
    );
    return { manager, service, vehicleAccess };
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
