import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UsersService } from './users.service';
import { User, UserRole } from './users.entity';

function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: 'user-1',
    companyId: 'company-1',
    email: 'test@example.com',
    password: 'salt.hash',
    googleId: null,
    firstName: null,
    lastName: null,
    role: UserRole.ADMIN,
    emailVerifiedAt: new Date(),
    lastLoginAt: null,
    passwordVersion: 1,
    verificationTokenHash: null,
    verificationTokenExpiresAt: null,
    passwordResetTokenHash: null,
    passwordResetTokenExpiresAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    company: {} as User['company'],
    ...overrides,
  };
}

describe('UsersService', () => {
  let service: UsersService;
  let repo: jest.Mocked<
    Pick<
      Repository<User>,
      'findOneBy' | 'create' | 'save' | 'createQueryBuilder' | 'softDelete'
    >
  >;

  beforeEach(async () => {
    repo = {
      findOneBy: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      createQueryBuilder: jest.fn(),
      softDelete: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: getRepositoryToken(User), useValue: repo },
      ],
    }).compile();

    service = module.get(UsersService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findOneById', () => {
    it('delegates to repository findOneBy', async () => {
      const user = makeUser();
      repo.findOneBy.mockResolvedValue(user);

      await expect(service.findOneById('user-1')).resolves.toBe(user);
      expect(repo.findOneBy).toHaveBeenCalledWith({ id: 'user-1' });
    });
  });

  describe('create', () => {
    it('creates and saves entity', async () => {
      const partial = { email: 'new@example.com' };
      const entity = makeUser(partial);
      repo.create.mockReturnValue(entity);
      repo.save.mockResolvedValue(entity);

      await expect(service.create(partial)).resolves.toBe(entity);
      expect(repo.create).toHaveBeenCalledWith(partial);
      expect(repo.save).toHaveBeenCalledWith(entity);
    });
  });

  describe('update', () => {
    it('updates existing user', async () => {
      const user = makeUser();
      const updated = { ...user, firstName: 'Jan' };
      repo.findOneBy.mockResolvedValue(user);
      repo.save.mockResolvedValue(updated);

      await expect(service.update(user.id, { firstName: 'Jan' })).resolves.toBe(
        updated,
      );
      expect(repo.save).toHaveBeenCalledWith(
        expect.objectContaining({ firstName: 'Jan' }),
      );
    });

    it('throws NotFoundException when user does not exist', async () => {
      repo.findOneBy.mockResolvedValue(null);

      await expect(
        service.update('missing', { firstName: 'Jan' }),
      ).rejects.toThrow(new NotFoundException('User not found'));
    });
  });

  describe('consumePasswordResetToken', () => {
    it('returns true when update affects a row', async () => {
      const qb = {
        update: jest.fn().mockReturnThis(),
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue({ affected: 1 }),
      };
      repo.createQueryBuilder.mockReturnValue(qb as never);

      await expect(
        service.consumePasswordResetToken('hash', 'new-pass'),
      ).resolves.toBe(true);
    });

    it('returns false when no row is updated', async () => {
      const qb = {
        update: jest.fn().mockReturnThis(),
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue({ affected: 0 }),
      };
      repo.createQueryBuilder.mockReturnValue(qb as never);

      await expect(
        service.consumePasswordResetToken('hash', 'new-pass'),
      ).resolves.toBe(false);
    });
  });

  describe('remove', () => {
    it('soft-deletes existing user', async () => {
      const user = makeUser();
      repo.findOneBy.mockResolvedValue(user);
      repo.softDelete.mockResolvedValue({
        affected: 1,
        raw: [],
        generatedMaps: [],
      });

      await service.remove(user.id);

      expect(repo.softDelete).toHaveBeenCalledWith(user.id);
    });

    it('throws NotFoundException when user does not exist', async () => {
      repo.findOneBy.mockResolvedValue(null);

      await expect(service.remove('missing')).rejects.toThrow(
        new NotFoundException('User not found'),
      );
    });
  });
});
