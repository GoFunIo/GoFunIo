import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Repository } from 'typeorm';
import { CompanyUsersService } from './company-users.service';
import { User, UserRole } from './users.entity';

function user(overrides: Partial<User> = {}): User {
  return {
    id: 'user-1',
    companyId: 'company-1',
    email: 'admin@example.com',
    role: UserRole.ADMIN,
    ...overrides,
  } as User;
}

describe('CompanyUsersService', () => {
  let service: CompanyUsersService;
  let repository: {
    manager: { transaction: jest.Mock };
  };

  beforeEach(() => {
    repository = {
      manager: { transaction: jest.fn() },
    };
    service = new CompanyUsersService(
      repository as unknown as Repository<User>,
      {} as ConfigService,
      {} as EventEmitter2,
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
      service.update(actor, actor.id, { role: UserRole.MANAGER }),
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
      service.update(actor, target.id, { role: UserRole.MANAGER }),
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
