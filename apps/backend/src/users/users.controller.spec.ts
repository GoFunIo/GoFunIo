import { Test, TestingModule } from '@nestjs/testing';
import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { UsersController } from './users.controller';
import { AuthService } from './auth.service';
import { User } from './users.entity';
import { MembershipRole } from './membership-role';
import type { SessionData } from '../types/session.types';
import { SessionAuthGuard } from './guards/session-auth.guard';
import { AllowedOriginGuard } from '../common/allowed-origin.guard';
import { SessionsService } from './sessions.service';
import { UsersService } from './users.service';
import type { SessionPrincipal } from './session-principal';

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
      | 'signInWithGoogle'
      | 'verifyEmail'
      | 'verifyEmailChange'
      | 'resendVerification'
      | 'requestPasswordReset'
      | 'resetPassword'
    >
  >;
  let sessions: jest.Mocked<Pick<SessionsService, 'establish' | 'clear'>>;
  let users: jest.Mocked<Pick<UsersService, 'findActiveById'>>;

  beforeEach(async () => {
    authService = {
      signup: jest.fn(),
      signin: jest.fn(),
      signInWithGoogle: jest.fn(),
      verifyEmail: jest.fn(),
      verifyEmailChange: jest.fn(),
      resendVerification: jest.fn(),
      requestPasswordReset: jest.fn(),
      resetPassword: jest.fn(),
    };
    sessions = { establish: jest.fn(), clear: jest.fn() };
    users = { findActiveById: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        { provide: AuthService, useValue: authService },
        { provide: SessionsService, useValue: sessions },
        { provide: UsersService, useValue: users },
      ],
    })
      .overrideGuard(ThrottlerGuard)
      .useClass(MockThrottlerGuard)
      .overrideGuard(SessionAuthGuard)
      .useClass(MockThrottlerGuard)
      .overrideGuard(AllowedOriginGuard)
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
    it('delegates authentication and session establishment', async () => {
      const user = makeUser({ passwordVersion: 3 });
      authService.signin.mockResolvedValue(user);
      const session = {} as SessionData;

      const result = await controller.signin(
        { email: user.email, password: 'secret' },
        session,
      );

      expect(authService.signin).toHaveBeenCalledWith(user.email, 'secret');
      expect(sessions.establish).toHaveBeenCalledWith(session, user.id);
      expect(result).toBe(user);
    });
  });

  describe('googleSignIn', () => {
    it('delegates authentication and session establishment', async () => {
      const user = makeUser({ passwordVersion: 4, password: null });
      authService.signInWithGoogle.mockResolvedValue(user);
      const session = {} as SessionData;

      const result = await controller.googleSignIn(
        { credential: 'google-id-token' },
        session,
      );

      expect(authService.signInWithGoogle).toHaveBeenCalledWith(
        'google-id-token',
      );
      expect(sessions.establish).toHaveBeenCalledWith(session, user.id);
      expect(result).toBe(user);
    });
  });

  describe('signout', () => {
    it('clears the session', () => {
      const session = {
        userId: 'user-1',
        passwordVersion: 2,
      } as SessionData;

      controller.signout(session);

      expect(sessions.clear).toHaveBeenCalledWith(session);
    });
  });

  describe('getMe', () => {
    it('loads the profile by principal id', async () => {
      const user = makeUser();
      const principal: SessionPrincipal = {
        id: user.id,
        companyId: user.companyId,
        role: user.role,
      };
      users.findActiveById.mockResolvedValue(user);

      await expect(controller.getMe(principal)).resolves.toBe(user);
      expect(users.findActiveById).toHaveBeenCalledWith(user.id);
    });

    it('rejects a missing profile', async () => {
      const principal: SessionPrincipal = {
        id: 'missing-user',
        companyId: 'company-1',
        role: MembershipRole.ADMIN,
      };
      users.findActiveById.mockResolvedValue(null);

      await expect(controller.getMe(principal)).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
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

  describe('verifyEmailChange', () => {
    it('delegates the body token to AuthService', async () => {
      authService.verifyEmailChange.mockResolvedValue(undefined);

      await expect(
        controller.verifyEmailChange({ token: 'abc' }),
      ).resolves.toEqual({ verified: true });
      expect(authService.verifyEmailChange).toHaveBeenCalledWith('abc');
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
