import { Test, TestingModule } from '@nestjs/testing';
import {
  CanActivate,
  ConflictException,
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
import { EmailVerificationService } from './email-verification.service';
import { PasswordRecoveryService } from './password-recovery.service';
import type { SessionPrincipal } from './session-principal';
import { EmailChangeService } from './email-change.service';

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
    Pick<AuthService, 'signup' | 'signin' | 'signInWithGoogle'>
  >;
  let emailVerification: jest.Mocked<
    Pick<EmailVerificationService, 'verify' | 'resend'>
  >;
  let passwordRecovery: jest.Mocked<
    Pick<PasswordRecoveryService, 'request' | 'reset'>
  >;
  let emailChange: jest.Mocked<Pick<EmailChangeService, 'confirm'>>;
  let sessions: jest.Mocked<Pick<SessionsService, 'establish' | 'clear'>>;
  let users: jest.Mocked<Pick<UsersService, 'findActiveById'>>;

  beforeEach(async () => {
    authService = {
      signup: jest.fn(),
      signin: jest.fn(),
      signInWithGoogle: jest.fn(),
    };
    emailVerification = { verify: jest.fn(), resend: jest.fn() };
    passwordRecovery = { request: jest.fn(), reset: jest.fn() };
    emailChange = { confirm: jest.fn() };
    sessions = { establish: jest.fn(), clear: jest.fn() };
    users = { findActiveById: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        { provide: AuthService, useValue: authService },
        { provide: EmailVerificationService, useValue: emailVerification },
        { provide: PasswordRecoveryService, useValue: passwordRecovery },
        { provide: EmailChangeService, useValue: emailChange },
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
      const user = { ...makeUser(), hasPassword: true as const };
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
    it('verifies the email, establishes a session and returns verified flag', async () => {
      emailVerification.verify.mockResolvedValue('user-1');
      const session = {} as SessionData;

      const result = await controller.verifyEmail({ token: 'abc' }, session);

      expect(emailVerification.verify).toHaveBeenCalledWith('abc');
      expect(sessions.establish).toHaveBeenCalledWith(session, 'user-1');
      expect(result).toEqual({ verified: true });
    });

    it('does not establish a session when verification fails', async () => {
      emailVerification.verify.mockRejectedValue(new Error('invalid token'));

      await expect(
        controller.verifyEmail({ token: 'abc' }, {}),
      ).rejects.toThrow('invalid token');
      expect(sessions.establish).not.toHaveBeenCalled();
    });

    it('does not consume the token or replace an existing session', async () => {
      const session = { userId: 'existing-user' } as SessionData;

      await expect(
        controller.verifyEmail({ token: 'abc' }, session),
      ).rejects.toEqual(
        new ConflictException('Sign out before verifying email'),
      );
      expect(emailVerification.verify).not.toHaveBeenCalled();
      expect(sessions.establish).not.toHaveBeenCalled();
    });
  });

  describe('verifyEmailChange', () => {
    it('delegates the body token to EmailChangeService', async () => {
      emailChange.confirm.mockResolvedValue(undefined);

      await expect(
        controller.verifyEmailChange({ token: 'abc' }),
      ).resolves.toEqual({ verified: true });
      expect(emailChange.confirm).toHaveBeenCalledWith('abc');
    });
  });

  describe('resendVerification', () => {
    it('delegates to EmailVerificationService', async () => {
      emailVerification.resend.mockResolvedValue(undefined);

      await controller.resendVerification(
        { email: 'test@example.com' },
        'http://localhost',
      );

      expect(emailVerification.resend).toHaveBeenCalledWith(
        'test@example.com',
        'http://localhost',
      );
    });
  });

  describe('forgotPassword', () => {
    it('delegates to PasswordRecoveryService.request', async () => {
      passwordRecovery.request.mockResolvedValue(undefined);

      await controller.forgotPassword(
        { email: 'test@example.com' },
        'http://localhost',
      );

      expect(passwordRecovery.request).toHaveBeenCalledWith(
        'test@example.com',
        'http://localhost',
      );
    });
  });

  describe('resetPassword', () => {
    it('delegates to PasswordRecoveryService.reset', async () => {
      passwordRecovery.reset.mockResolvedValue(undefined);

      await controller.resetPassword({
        token: 'reset-token',
        password: 'new-password',
      });

      expect(passwordRecovery.reset).toHaveBeenCalledWith(
        'reset-token',
        'new-password',
      );
    });
  });
});
