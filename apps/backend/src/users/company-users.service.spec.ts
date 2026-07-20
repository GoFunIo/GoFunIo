import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { Repository } from 'typeorm';
import { CompanyUsersService } from './company-users.service';
import { User } from './users.entity';
import { MembershipRole } from './membership-role';
import { PasswordRecoveryService } from './password-recovery.service';

function user(overrides: Partial<User> = {}): User {
  return {
    id: 'user-1',
    companyId: 'company-1',
    email: 'admin@example.com',
    role: MembershipRole.ADMIN,
    ...overrides,
  } as User;
}

describe('CompanyUsersService', () => {
  let service: CompanyUsersService;
  let repository: {
    manager: { transaction: jest.Mock };
  };
  let passwordRecovery: jest.Mocked<
    Pick<PasswordRecoveryService, 'issueFirstPassword'>
  >;

  beforeEach(() => {
    repository = {
      manager: { transaction: jest.fn() },
    };
    passwordRecovery = { issueFirstPassword: jest.fn() };
    service = new CompanyUsersService(
      repository as unknown as Repository<User>,
      passwordRecovery as unknown as PasswordRecoveryService,
    );
  });

  it('delegates first-password lifecycle after creating a user', async () => {
    const actor = user();
    const created = user({
      id: 'user-2',
      email: 'new@example.com',
      password: null,
      emailVerifiedAt: null,
    });
    const queryBuilder = {
      innerJoin: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      setLock: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([actor]),
    };
    const manager = {
      createQueryBuilder: jest.fn().mockReturnValue(queryBuilder),
      query: jest
        .fn()
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([{ exists: false }]),
      create: jest.fn().mockReturnValue(created),
      save: jest.fn().mockResolvedValue(created),
    };
    repository.manager.transaction.mockImplementation(
      async (callback: (value: typeof manager) => Promise<User>) =>
        callback(manager),
    );

    await expect(
      service.create(
        actor,
        {
          email: created.email,
          role: MembershipRole.MANAGER,
        },
        'http://localhost',
      ),
    ).resolves.toBe(created);
    expect(passwordRecovery.issueFirstPassword).toHaveBeenCalledWith(
      created.id,
      'http://localhost',
    );
  });

  it('rejects empty updates', async () => {
    await expect(service.update(user(), 'user-2', {})).rejects.toThrow(
      new BadRequestException('No changes provided'),
    );
  });

  it('rejects self-demotion and self-deletion', async () => {
    const actor = user();

    await expect(
      service.update(actor, actor.id, { role: MembershipRole.MANAGER }),
    ).rejects.toThrow(new ConflictException('Cannot demote yourself'));
    await expect(service.remove(actor, actor.id)).rejects.toThrow(
      new ConflictException('Cannot delete yourself'),
    );
  });

  it('rejects demoting the last active admin', async () => {
    const actor = user();
    const target = user({ id: 'user-2' });
    const query = {
      innerJoin: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      setLock: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([actor]),
    };
    const manager = {
      createQueryBuilder: jest.fn().mockReturnValue(query),
      findOne: jest.fn().mockResolvedValue(target),
      save: jest.fn(),
    };
    repository.manager.transaction.mockImplementation(
      async (callback: (value: typeof manager) => Promise<unknown>) =>
        callback(manager),
    );

    await expect(
      service.update(actor, target.id, { role: MembershipRole.MANAGER }),
    ).rejects.toThrow(new ConflictException('Company must have an admin'));
    expect(manager.save).not.toHaveBeenCalled();
  });

  it('rejects an actor whose ADMIN role was revoked', async () => {
    const query = {
      innerJoin: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      setLock: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([]),
    };
    const manager = {
      createQueryBuilder: jest.fn().mockReturnValue(query),
    };
    repository.manager.transaction.mockImplementation(
      async (callback: (value: typeof manager) => Promise<unknown>) =>
        callback(manager),
    );

    await expect(
      service.update(user(), 'user-2', { firstName: 'Blocked' }),
    ).rejects.toThrow(ForbiddenException);
  });
});
