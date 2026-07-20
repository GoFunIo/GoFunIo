import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { DataSource, QueryFailedError } from 'typeorm';
import { AuthService } from './auth.service';
import { UsersService } from './users.service';
import { User } from './users.entity';
import { MembershipRole } from './membership-role';
import { randomBytes, scrypt as _scrypt } from 'crypto';
import { promisify } from 'util';
import { EmailVerificationService } from './email-verification.service';

const scrypt = promisify(_scrypt);
const HASH_BYTES = 32;

const mockVerifyIdToken = jest.fn();

jest.mock('google-auth-library', () => ({
  OAuth2Client: jest.fn().mockImplementation(() => ({
    verifyIdToken: mockVerifyIdToken,
  })),
}));

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
    googleId: null,
    firstName: null,
    lastName: null,
    phone: null,
    address: null,
    postalCode: null,
    city: null,
    pendingEmail: null,
    emailChangeTokenHash: null,
    emailChangeTokenExpiresAt: null,
    role: MembershipRole.ADMIN,
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
      'findActiveByEmail' | 'findActiveByGoogleId' | 'update' | 'updatePassword'
    >
  >;
  let emailVerification: jest.Mocked<
    Pick<EmailVerificationService, 'register'>
  >;
  let config: { get: jest.Mock };
  let dataSource: { transaction: jest.Mock };

  beforeEach(async () => {
    usersService = {
      findActiveByEmail: jest.fn(),
      findActiveByGoogleId: jest.fn(),
      update: jest.fn(),
      updatePassword: jest.fn(),
    };
    emailVerification = { register: jest.fn() };
    config = {
      get: jest.fn().mockImplementation((key: string) => {
        if (key === 'GOOGLE_CLIENT_ID') {
          return 'test-google-client-id';
        }
        return 24;
      }),
    };
    dataSource = { transaction: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: usersService },
        { provide: EmailVerificationService, useValue: emailVerification },
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
    it('hashes credentials and delegates atomic provisioning', async () => {
      const savedUser = makeUser({
        email: 'new@example.com',
        emailVerifiedAt: null,
      });
      const account = { ...savedUser, hasPassword: true as const };
      emailVerification.register.mockResolvedValue(account);

      const result = await service.signup(
        ' New@Example.com ',
        'password123',
        'http://localhost',
      );

      expect(result).toBe(account);
      expect(emailVerification.register).toHaveBeenCalledWith(
        'new@example.com',
        expect.not.stringContaining('password123'),
        'http://localhost',
      );
      expect(dataSource.transaction).not.toHaveBeenCalled();
    });
  });

  describe('signin', () => {
    it('returns user and updates lastLoginAt when credentials are valid', async () => {
      const password = 'correct-password';
      const hashed = await buildPasswordHash(password);
      const user = makeUser({ password: hashed, emailVerifiedAt: new Date() });

      usersService.findActiveByEmail.mockResolvedValue(user);
      usersService.update.mockResolvedValue(user);

      const result = await service.signin(user.email, password);

      expect(result).toBe(user);
      expect(usersService.update).toHaveBeenCalledWith(user.id, {
        lastLoginAt: expect.any(Date),
      });
    });

    it('throws UnauthorizedException when user not found', async () => {
      usersService.findActiveByEmail.mockResolvedValue(null);

      await expect(
        service.signin('missing@example.com', 'password'),
      ).rejects.toThrow(new UnauthorizedException('Invalid credentials'));
    });

    it('throws UnauthorizedException when password is wrong', async () => {
      const hashed = await buildPasswordHash('real-password');
      const user = makeUser({ password: hashed, emailVerifiedAt: new Date() });
      usersService.findActiveByEmail.mockResolvedValue(user);

      await expect(
        service.signin(user.email, 'wrong-password'),
      ).rejects.toThrow(new UnauthorizedException('Invalid credentials'));
    });

    it('throws UnauthorizedException when email is not verified', async () => {
      const password = 'correct-password';
      const hashed = await buildPasswordHash(password);
      const user = makeUser({ password: hashed, emailVerifiedAt: null });
      usersService.findActiveByEmail.mockResolvedValue(user);

      await expect(service.signin(user.email, password)).rejects.toThrow(
        new UnauthorizedException('Email not verified'),
      );
    });

    it('throws UnauthorizedException when user has no password', async () => {
      const user = makeUser({ password: null, emailVerifiedAt: new Date() });
      usersService.findActiveByEmail.mockResolvedValue(user);

      await expect(service.signin(user.email, 'any-password')).rejects.toThrow(
        new UnauthorizedException('Invalid credentials'),
      );
    });
  });

  describe('signInWithGoogle', () => {
    function mockGooglePayload(overrides: Record<string, unknown> = {}): void {
      mockVerifyIdToken.mockResolvedValue({
        getPayload: () => ({
          sub: 'google-sub-1',
          email: 'google@example.com',
          email_verified: true,
          given_name: 'Jan',
          family_name: 'Kowalski',
          ...overrides,
        }),
      });
    }

    it('creates verified user without verification email', async () => {
      mockGooglePayload();
      usersService.findActiveByGoogleId.mockResolvedValue(null);
      usersService.findActiveByEmail.mockResolvedValue(null);

      const savedUser = makeUser({
        email: 'google@example.com',
        password: null,
        googleId: 'google-sub-1',
        firstName: 'Jan',
        lastName: 'Kowalski',
      });
      dataSource.transaction.mockImplementation(async (cb) => {
        const manager = {
          query: jest.fn().mockResolvedValue([{ exists: false }]),
          createQueryBuilder: jest.fn().mockReturnValue({
            innerJoinAndSelect: jest.fn().mockReturnThis(),
            where: jest.fn().mockReturnThis(),
            andWhere: jest.fn().mockReturnThis(),
            getOne: jest.fn().mockResolvedValue(null),
          }),
          create: jest.fn((_entity, data) => data),
          save: jest
            .fn()
            .mockResolvedValueOnce({ id: 'company-1' })
            .mockResolvedValueOnce(savedUser),
        };
        return cb(manager);
      });

      const result = await service.signInWithGoogle('valid-token');

      expect(result).toBe(savedUser);
    });

    it('returns existing user by googleId and updates lastLoginAt', async () => {
      mockGooglePayload();
      const user = makeUser({ googleId: 'google-sub-1' });
      usersService.findActiveByGoogleId.mockResolvedValue(user);
      usersService.update.mockResolvedValue(user);

      const result = await service.signInWithGoogle('valid-token');

      expect(result).toBe(user);
      expect(usersService.update).toHaveBeenCalledWith(user.id, {
        lastLoginAt: expect.any(Date),
      });
    });

    it('auto-links verified Gmail account', async () => {
      mockGooglePayload({ email: 'verified@gmail.com' });
      usersService.findActiveByGoogleId.mockResolvedValue(null);
      const user = makeUser({
        email: 'verified@gmail.com',
        googleId: null,
        emailVerifiedAt: new Date(),
      });
      usersService.findActiveByEmail.mockResolvedValue(user);
      usersService.update.mockResolvedValue(user);

      const result = await service.signInWithGoogle('valid-token');

      expect(result.googleId).toBe('google-sub-1');
      expect(usersService.update).toHaveBeenCalledWith(user.id, {
        googleId: 'google-sub-1',
        lastLoginAt: expect.any(Date),
      });
    });

    it('rejects auto-link for non-authoritative Google email', async () => {
      mockGooglePayload({ email: 'verified@example.com' });
      usersService.findActiveByGoogleId.mockResolvedValue(null);
      usersService.findActiveByEmail.mockResolvedValue(
        makeUser({
          email: 'verified@example.com',
          googleId: null,
          emailVerifiedAt: new Date(),
        }),
      );

      await expect(service.signInWithGoogle('valid-token')).rejects.toThrow(
        new ConflictException('Sign in with password before linking Google'),
      );
    });

    it('rejects unverified email account', async () => {
      mockGooglePayload({ email: 'pending@example.com' });
      usersService.findActiveByGoogleId.mockResolvedValue(null);
      usersService.findActiveByEmail.mockResolvedValue(
        makeUser({ email: 'pending@example.com', emailVerifiedAt: null }),
      );

      await expect(service.signInWithGoogle('valid-token')).rejects.toThrow(
        new ConflictException('Verify email before linking Google'),
      );
    });

    it('throws UnauthorizedException for invalid token', async () => {
      mockVerifyIdToken.mockRejectedValue(new Error('bad token'));

      await expect(service.signInWithGoogle('bad-token')).rejects.toThrow(
        new UnauthorizedException('Invalid Google token'),
      );
    });

    it('returns user created by a concurrent Google sign-in', async () => {
      mockGooglePayload({ email: 'race@example.com' });
      const user = makeUser({
        email: 'race@example.com',
        password: null,
        googleId: 'google-sub-1',
      });
      usersService.findActiveByGoogleId
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(user);
      usersService.findActiveByEmail.mockResolvedValue(null);
      const driverError = Object.assign(new Error('unique violation'), {
        code: '23505',
      });
      dataSource.transaction.mockRejectedValue(
        new QueryFailedError('INSERT', [], driverError),
      );

      await expect(service.signInWithGoogle('valid-token')).resolves.toBe(user);
    });
  });

  describe('changePassword', () => {
    it('rejects an update when the current password changed concurrently', async () => {
      const user = makeUser({
        password: await buildPasswordHash('current-password'),
      });
      usersService.updatePassword.mockResolvedValue(null);

      await expect(
        service.changePassword(user, 'current-password', 'new-password'),
      ).rejects.toThrow(new UnauthorizedException('Current password changed'));
    });
  });
});
