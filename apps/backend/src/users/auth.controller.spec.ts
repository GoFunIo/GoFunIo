import { Test, TestingModule } from '@nestjs/testing';
import {
  CanActivate,
  ConflictException,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { AuthController } from './auth.controller';
import { EmailRegistrationService } from './email-registration.service';
import { User } from './users.entity';
import { MembershipRole } from './membership-role';
import type { SessionData } from '../types/session.types';
import { SessionAuthGuard } from './guards/session-auth.guard';
import { AllowedOriginGuard } from '../common/allowed-origin.guard';
import { SessionsService } from './sessions.service';
import { EmailVerificationService } from './email-verification.service';
import { PasswordRecoveryService } from './password-recovery.service';
import type { SessionPrincipal } from './session-principal';
import { EmailChangeService } from './email-change.service';
import { CredentialAuthenticationService } from './credential-authentication.service';
import { GoogleAuthenticationService } from './google-authentication.service';

@Injectable()
class MockThrottlerGuard implements CanActivate {
  canActivate(_context: ExecutionContext): boolean {
    return true;
  }
}

function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: 'user-1',
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
    ...overrides,
  };
}

describe('AuthController', () => {
  const companyId = 'company-1';
  const role = MembershipRole.ADMIN;
  let controller: AuthController;
  let emailRegistration: jest.Mocked<
    Pick<EmailRegistrationService, 'register'>
  >;
  let emailVerification: jest.Mocked<
    Pick<EmailVerificationService, 'verify' | 'resend'>
  >;
  let passwordRecovery: jest.Mocked<
    Pick<PasswordRecoveryService, 'request' | 'reset'>
  >;
  let emailChange: jest.Mocked<Pick<EmailChangeService, 'confirm'>>;
  let credentials: jest.Mocked<
    Pick<CredentialAuthenticationService, 'signin' | 'findAccount'>
  >;
  let sessions: jest.Mocked<
    Pick<
      SessionsService,
      'establish' | 'clear' | 'listCompanies' | 'switchCompany'
    >
  >;
  let googleAuthentication: jest.Mocked<
    Pick<GoogleAuthenticationService, 'signin' | 'link'>
  >;

  beforeEach(async () => {
    emailRegistration = { register: jest.fn() };
    emailVerification = { verify: jest.fn(), resend: jest.fn() };
    passwordRecovery = { request: jest.fn(), reset: jest.fn() };
    emailChange = { confirm: jest.fn() };
    credentials = { signin: jest.fn(), findAccount: jest.fn() };
    sessions = {
      establish: jest.fn(),
      clear: jest.fn(),
      listCompanies: jest.fn(),
      switchCompany: jest.fn(),
    };
    googleAuthentication = { signin: jest.fn(), link: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: EmailRegistrationService,
          useValue: emailRegistration,
        },
        { provide: EmailVerificationService, useValue: emailVerification },
        { provide: PasswordRecoveryService, useValue: passwordRecovery },
        { provide: EmailChangeService, useValue: emailChange },
        { provide: CredentialAuthenticationService, useValue: credentials },
        { provide: SessionsService, useValue: sessions },
        {
          provide: GoogleAuthenticationService,
          useValue: googleAuthentication,
        },
      ],
    })
      .overrideGuard(ThrottlerGuard)
      .useClass(MockThrottlerGuard)
      .overrideGuard(SessionAuthGuard)
      .useClass(MockThrottlerGuard)
      .overrideGuard(AllowedOriginGuard)
      .useClass(MockThrottlerGuard)
      .compile();

    controller = module.get(AuthController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('signup', () => {
    it('delegates to EmailRegistrationService with email, password and origin', async () => {
      const user = { ...makeUser(), hasPassword: true as const };
      emailRegistration.register.mockResolvedValue(user);

      const result = await controller.signup(
        { email: 'new@example.com', password: 'secret' },
        'http://localhost:5173',
      );

      expect(emailRegistration.register).toHaveBeenCalledWith(
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
      const account = { ...user, hasPassword: true };
      credentials.signin.mockResolvedValue({
        account,
        passwordVersion: user.passwordVersion,
      });
      sessions.establish.mockResolvedValue({
        id: user.id,
        companyId,
        role,
      });
      const session = {} as SessionData;

      const result = await controller.signin(
        { email: user.email, password: 'secret' },
        session,
      );

      expect(credentials.signin).toHaveBeenCalledWith(user.email, 'secret');
      expect(sessions.establish).toHaveBeenCalledWith(
        session,
        user.id,
        user.passwordVersion,
      );
      expect(result).toMatchObject({
        id: user.id,
        email: user.email,
        companyId,
        role,
        hasPassword: true,
      });
    });
  });

  describe('googleSignIn', () => {
    it('delegates authentication and session establishment', async () => {
      const user = makeUser({ passwordVersion: 4, password: null });
      const account = { ...user, hasPassword: false };
      googleAuthentication.signin.mockResolvedValue(account);
      sessions.establish.mockResolvedValue({
        id: user.id,
        companyId,
        role,
      });
      const session = {} as SessionData;

      const result = await controller.googleSignIn(
        { credential: 'google-id-token' },
        session,
      );

      expect(googleAuthentication.signin).toHaveBeenCalledWith(
        'google-id-token',
      );
      expect(sessions.establish).toHaveBeenCalledWith(session, user.id);
      expect(result).toMatchObject({
        id: user.id,
        companyId,
        role,
        hasPassword: false,
      });
    });

    it('links Google to the authenticated principal', async () => {
      const user = makeUser();
      const account = { ...user, hasPassword: true };
      googleAuthentication.link.mockResolvedValue(account);
      const principal: SessionPrincipal = {
        id: user.id,
        companyId,
        role,
      };

      await expect(
        controller.googleLink(
          { credential: 'google-id-token', password: 'secret' },
          principal,
        ),
      ).resolves.toBe(account);
      expect(googleAuthentication.link).toHaveBeenCalledWith(
        user.id,
        'google-id-token',
        'secret',
      );
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
    it('composes the current user view from account and principal', async () => {
      const user = makeUser();
      const account = {
        id: user.id,
        email: user.email,
        firstName: null,
        lastName: null,
        phone: null,
        address: null,
        postalCode: null,
        city: null,
        pendingEmail: null,
        hasPassword: true,
      };
      const principal: SessionPrincipal = {
        id: user.id,
        companyId,
        role,
      };
      credentials.findAccount.mockResolvedValue(account);

      await expect(controller.getMe(principal)).resolves.toEqual({
        ...account,
        companyId: principal.companyId,
        role: principal.role,
      });
      expect(credentials.findAccount).toHaveBeenCalledWith(user.id);
    });

    it('rejects a missing account', async () => {
      const principal: SessionPrincipal = {
        id: 'missing-user',
        companyId: 'company-1',
        role: MembershipRole.ADMIN,
      };
      credentials.findAccount.mockResolvedValue(null);

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
