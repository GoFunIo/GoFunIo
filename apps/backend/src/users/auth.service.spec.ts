import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Test, TestingModule } from '@nestjs/testing';
import { DataSource, QueryFailedError } from 'typeorm';
import { AuthService } from './auth.service';
import { UsersService } from './users.service';
import { User, UserRole } from './users.entity';
import {
  USER_REGISTERED_EVENT,
  UserRegisteredEvent,
} from './events/user-registered.event';
import {
  PASSWORD_RESET_REQUESTED_EVENT,
  PasswordResetRequestedEvent,
} from './events/password-reset-requested.event';
import { hashVerificationToken } from './verification-token.util';
import { randomBytes, scrypt as _scrypt } from 'crypto';
import { promisify } from 'util';

const scrypt = promisify(_scrypt);
const HASH_BYTES = 32;

async function buildPasswordHash(password: string): Promise<string> {
  const salt = randomBytes(16).toString('hex');
  const hash = (await scrypt(password, salt, HASH_BYTES)) as Buffer;
  return salt + '.' + hash.toString('hex');
}

function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: 'user-1',
    companyId: 'company-1',
    email: 'test@example.com',
    password: 'salt.hash',
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

describe('AuthService', () => {
  let service: AuthService;
  let usersService: jest.Mocked<
    Pick<
      UsersService,
      | 'findOneByEmail'
      | 'findOneByVerificationTokenHash'
      | 'update'
      | 'consumePasswordResetToken'
    >
  >;
  let eventEmitter: { emit: jest.Mock };
  let config: { get: jest.Mock };
  let dataSource: { transaction: jest.Mock };

  beforeEach(async () => {
    usersService = {
      findOneByEmail: jest.fn(),
      findOneByVerificationTokenHash: jest.fn(),
      update: jest.fn(),
      consumePasswordResetToken: jest.fn(),
    };
    eventEmitter = { emit: jest.fn() };
    config = { get: jest.fn().mockReturnValue(24) };
    dataSource = { transaction: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: usersService },
        { provide: EventEmitter2, useValue: eventEmitter },
        { provide: ConfigService, useValue: config },
        { provide: DataSource, useValue: dataSource },
      ],
    }).compile();

    service = module.get(AuthService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('signup', () => {
    it('creates user in transaction and emits USER_REGISTERED_EVENT', async () => {
      const savedUser = makeUser({
        email: 'new@example.com',
        emailVerifiedAt: null,
      });
      dataSource.transaction.mockImplementation(async (cb) => {
        const manager = {
          create: jest.fn((_entity, data) => data),
          save: jest
            .fn()
            .mockResolvedValueOnce({ id: 'company-1' })
            .mockResolvedValueOnce(savedUser),
        };
        return cb(manager);
      });

      const result = await service.signup('new@example.com', 'password123');

      expect(result).toBe(savedUser);
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        USER_REGISTERED_EVENT,
        expect.any(UserRegisteredEvent),
      );
      const event = eventEmitter.emit.mock.calls[0][1] as UserRegisteredEvent;
      expect(event.email).toBe('new@example.com');
      expect(event.userId).toBe(savedUser.id);
    });

    it('throws BadRequestException on duplicate email', async () => {
      const driverError = Object.assign(new Error('unique violation'), {
        code: '23505',
      });
      const err = new QueryFailedError('INSERT', [], driverError);
      dataSource.transaction.mockRejectedValue(err);

      await expect(
        service.signup('dup@example.com', 'password123'),
      ).rejects.toThrow(new BadRequestException('Email already in use'));
    });

    it('rethrows non-unique database errors', async () => {
      const err = new Error('connection lost');
      dataSource.transaction.mockRejectedValue(err);

      await expect(
        service.signup('new@example.com', 'password123'),
      ).rejects.toThrow('connection lost');
    });
  });

  describe('signin', () => {
    it('returns user and updates lastLoginAt when credentials are valid', async () => {
      const password = 'correct-password';
      const hashed = await buildPasswordHash(password);
      const user = makeUser({ password: hashed, emailVerifiedAt: new Date() });

      usersService.findOneByEmail.mockResolvedValue(user);
      usersService.update.mockResolvedValue(user);

      const result = await service.signin(user.email, password);

      expect(result).toBe(user);
      expect(usersService.update).toHaveBeenCalledWith(user.id, {
        lastLoginAt: expect.any(Date),
      });
    });

    it('throws UnauthorizedException when user not found', async () => {
      usersService.findOneByEmail.mockResolvedValue(null);

      await expect(
        service.signin('missing@example.com', 'password'),
      ).rejects.toThrow(new UnauthorizedException('Invalid credentials'));
    });

    it('throws UnauthorizedException when password is wrong', async () => {
      const hashed = await buildPasswordHash('real-password');
      const user = makeUser({ password: hashed, emailVerifiedAt: new Date() });
      usersService.findOneByEmail.mockResolvedValue(user);

      await expect(
        service.signin(user.email, 'wrong-password'),
      ).rejects.toThrow(new UnauthorizedException('Invalid credentials'));
    });

    it('throws UnauthorizedException when email is not verified', async () => {
      const password = 'correct-password';
      const hashed = await buildPasswordHash(password);
      const user = makeUser({ password: hashed, emailVerifiedAt: null });
      usersService.findOneByEmail.mockResolvedValue(user);

      await expect(service.signin(user.email, password)).rejects.toThrow(
        new UnauthorizedException('Email not verified'),
      );
    });
  });

  describe('verifyEmail', () => {
    it('marks user as verified when token is valid', async () => {
      const token = 'valid-token';
      const user = makeUser({
        emailVerifiedAt: null,
        verificationTokenExpiresAt: new Date(Date.now() + 60_000),
      });
      usersService.findOneByVerificationTokenHash.mockResolvedValue(user);
      usersService.update.mockResolvedValue(user);

      await service.verifyEmail(token);

      expect(usersService.findOneByVerificationTokenHash).toHaveBeenCalledWith(
        hashVerificationToken(token),
      );
      expect(usersService.update).toHaveBeenCalledWith(user.id, {
        emailVerifiedAt: expect.any(Date),
        verificationTokenHash: null,
        verificationTokenExpiresAt: null,
      });
    });

    it('throws BadRequestException when token is invalid or expired', async () => {
      usersService.findOneByVerificationTokenHash.mockResolvedValue(null);

      await expect(service.verifyEmail('bad-token')).rejects.toThrow(
        new BadRequestException('Invalid or expired token'),
      );
    });

    it('throws BadRequestException when email already verified', async () => {
      const user = makeUser({
        emailVerifiedAt: new Date(),
        verificationTokenExpiresAt: new Date(Date.now() + 60_000),
      });
      usersService.findOneByVerificationTokenHash.mockResolvedValue(user);

      await expect(service.verifyEmail('token')).rejects.toThrow(
        new BadRequestException('Invalid or expired token'),
      );
    });
  });

  describe('resendVerification', () => {
    it('updates token and emits event for unverified user', async () => {
      const user = makeUser({ emailVerifiedAt: null });
      usersService.findOneByEmail.mockResolvedValue(user);
      usersService.update.mockResolvedValue(user);

      await service.resendVerification(user.email, 'http://localhost');

      expect(usersService.update).toHaveBeenCalledWith(user.id, {
        verificationTokenHash: expect.any(String),
        verificationTokenExpiresAt: expect.any(Date),
      });
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        USER_REGISTERED_EVENT,
        expect.any(UserRegisteredEvent),
      );
    });

    it('returns silently when user does not exist', async () => {
      usersService.findOneByEmail.mockResolvedValue(null);

      await service.resendVerification('missing@example.com');

      expect(usersService.update).not.toHaveBeenCalled();
      expect(eventEmitter.emit).not.toHaveBeenCalled();
    });

    it('returns silently when email is already verified', async () => {
      usersService.findOneByEmail.mockResolvedValue(
        makeUser({ emailVerifiedAt: new Date() }),
      );

      await service.resendVerification('verified@example.com');

      expect(usersService.update).not.toHaveBeenCalled();
      expect(eventEmitter.emit).not.toHaveBeenCalled();
    });
  });

  describe('requestPasswordReset', () => {
    it('stores reset token and emits PASSWORD_RESET_REQUESTED_EVENT', async () => {
      const user = makeUser();
      usersService.findOneByEmail.mockResolvedValue(user);
      usersService.update.mockResolvedValue(user);

      await service.requestPasswordReset(user.email, 'http://localhost');

      expect(usersService.update).toHaveBeenCalledWith(user.id, {
        passwordResetTokenHash: expect.any(String),
        passwordResetTokenExpiresAt: expect.any(Date),
      });
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        PASSWORD_RESET_REQUESTED_EVENT,
        expect.any(PasswordResetRequestedEvent),
      );
    });

    it('returns silently when user does not exist', async () => {
      usersService.findOneByEmail.mockResolvedValue(null);

      await service.requestPasswordReset('missing@example.com');

      expect(usersService.update).not.toHaveBeenCalled();
      expect(eventEmitter.emit).not.toHaveBeenCalled();
    });
  });

  describe('resetPassword', () => {
    it('consumes reset token with new password hash', async () => {
      usersService.consumePasswordResetToken.mockResolvedValue(true);

      await service.resetPassword('reset-token', 'new-password-123');

      expect(usersService.consumePasswordResetToken).toHaveBeenCalledWith(
        hashVerificationToken('reset-token'),
        expect.stringMatching(/^[a-f0-9]+\.[a-f0-9]+$/),
      );
    });

    it('throws BadRequestException when token is invalid or expired', async () => {
      usersService.consumePasswordResetToken.mockResolvedValue(false);

      await expect(
        service.resetPassword('bad-token', 'new-password'),
      ).rejects.toThrow(new BadRequestException('Invalid or expired token'));
    });
  });
});
