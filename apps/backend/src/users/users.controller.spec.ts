import { Test, TestingModule } from '@nestjs/testing';
import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { UsersController } from './users.controller';
import { AuthService } from './auth.service';
import { UsersService } from './users.service';
import { CurrentUserInterceptor } from './interceptors/current-user.interceptor';
import { User, UserRole } from './users.entity';
import type { SessionData } from '../types/session.types';

@Injectable()
class MockThrottlerGuard implements CanActivate {
  canActivate(_context: ExecutionContext): boolean {
    return true;
  }
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
    passwordVersion: 2,
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

describe('UsersController', () => {
  let controller: UsersController;
  let authService: jest.Mocked<
    Pick<
      AuthService,
      | 'signup'
      | 'signin'
      | 'verifyEmail'
      | 'resendVerification'
      | 'requestPasswordReset'
      | 'resetPassword'
    >
  >;

  beforeEach(async () => {
    authService = {
      signup: jest.fn(),
      signin: jest.fn(),
      verifyEmail: jest.fn(),
      resendVerification: jest.fn(),
      requestPasswordReset: jest.fn(),
      resetPassword: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        { provide: AuthService, useValue: authService },
        CurrentUserInterceptor,
        { provide: UsersService, useValue: { findOneById: jest.fn() } },
      ],
    })
      .overrideGuard(ThrottlerGuard)
      .useClass(MockThrottlerGuard)
      .compile();

    controller = module.get(UsersController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('signup', () => {
    it('delegates to AuthService with email, password and origin', async () => {
      const user = makeUser();
      authService.signup.mockResolvedValue(user);

      const result = await controller.signup(
        { email: 'new@example.com', password: 'secret' },
        'http://localhost:5173',
      );

      expect(authService.signup).toHaveBeenCalledWith(
        'new@example.com',
        'secret',
        'http://localhost:5173',
      );
      expect(result).toBe(user);
    });
  });

  describe('signin', () => {
    it('delegates to AuthService and stores user in session', async () => {
      const user = makeUser({ passwordVersion: 3 });
      authService.signin.mockResolvedValue(user);
      const session = {} as SessionData;

      const result = await controller.signin(
        { email: user.email, password: 'secret' },
        session,
      );

      expect(authService.signin).toHaveBeenCalledWith(user.email, 'secret');
      expect(session.userId).toBe(user.id);
      expect(session.passwordVersion).toBe(3);
      expect(result).toBe(user);
    });
  });

  describe('signout', () => {
    it('clears session userId, passwordVersion and cached user', () => {
      const session = {
        userId: 'user-1',
        passwordVersion: 2,
        user: makeUser(),
      } as SessionData & { user: User };

      controller.signout(session);

      expect(session.userId).toBeNull();
      expect(session.passwordVersion).toBeNull();
      expect(session.user).toBeUndefined();
    });
  });

  describe('getMe', () => {
    it('returns current user from decorator', () => {
      const user = makeUser();

      expect(controller.getMe(user)).toBe(user);
    });
  });

  describe('verifyEmail', () => {
    it('delegates to AuthService and returns verified flag', async () => {
      authService.verifyEmail.mockResolvedValue(undefined);

      const result = await controller.verifyEmail({ token: 'abc' });

      expect(authService.verifyEmail).toHaveBeenCalledWith('abc');
      expect(result).toEqual({ verified: true });
    });
  });

  describe('resendVerification', () => {
    it('delegates to AuthService', async () => {
      authService.resendVerification.mockResolvedValue(undefined);

      await controller.resendVerification(
        { email: 'test@example.com' },
        'http://localhost',
      );

      expect(authService.resendVerification).toHaveBeenCalledWith(
        'test@example.com',
        'http://localhost',
      );
    });
  });

  describe('forgotPassword', () => {
    it('delegates to AuthService.requestPasswordReset', async () => {
      authService.requestPasswordReset.mockResolvedValue(undefined);

      await controller.forgotPassword(
        { email: 'test@example.com' },
        'http://localhost',
      );

      expect(authService.requestPasswordReset).toHaveBeenCalledWith(
        'test@example.com',
        'http://localhost',
      );
    });
  });

  describe('resetPassword', () => {
    it('delegates to AuthService.resetPassword', async () => {
      authService.resetPassword.mockResolvedValue(undefined);

      await controller.resetPassword({
        token: 'reset-token',
        password: 'new-password',
      });

      expect(authService.resetPassword).toHaveBeenCalledWith(
        'reset-token',
        'new-password',
      );
    });
  });
});
