import { UnauthorizedException } from '@nestjs/common';
import { ConflictCode, conflictException } from '../common/conflict';
import type { SessionData } from '../types/session.types';
import { AuthController } from './auth.controller';
import { MembershipRole } from './membership-role';
import type { SessionPrincipal } from './session-principal';

describe('AuthController orchestration', () => {
  const sessions = {
    establish: jest.fn(),
    clear: jest.fn(),
    listCompanies: jest.fn(),
    switchCompany: jest.fn(),
  };
  const emailVerification = { verify: jest.fn(), resend: jest.fn() };
  const credentials = { signin: jest.fn() };
  const userProfiles = { get: jest.fn() };

  const controller = new AuthController(
    {} as never,
    sessions as never,
    emailVerification as never,
    {} as never,
    {} as never,
    credentials as never,
    {} as never,
    userProfiles as never,
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('uses the authenticated password version when establishing a session', async () => {
    const account = {
      id: 'user-1',
      email: 'user@example.com',
      firstName: null,
      lastName: null,
      phone: null,
      address: null,
      postalCode: null,
      city: null,
      pendingEmail: null,
      hasPassword: true,
    };
    credentials.signin.mockResolvedValue({ account, passwordVersion: 4 });
    sessions.establish.mockResolvedValue({
      id: account.id,
      companyId: 'company-1',
      role: MembershipRole.ADMIN,
    });
    const session = {} as SessionData;

    await expect(
      controller.signin(
        { email: account.email, password: 'Password123!' },
        session,
      ),
    ).resolves.toMatchObject({
      ...account,
      companyId: 'company-1',
      role: MembershipRole.ADMIN,
    });
    expect(sessions.establish).toHaveBeenCalledWith(session, account.id, 4);
  });

  it('rejects a principal whose account no longer exists', async () => {
    const principal: SessionPrincipal = {
      id: 'missing-user',
      companyId: 'company-1',
      role: MembershipRole.ADMIN,
    };
    userProfiles.get.mockResolvedValue(null);

    await expect(controller.getMe(principal)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('does not consume a verification token over an existing session', async () => {
    const session = { userId: 'existing-user' } as SessionData;

    await expect(
      controller.verifyEmail({ token: 'abc' }, session),
    ).rejects.toEqual(
      conflictException(
        'Sign out before verifying email',
        ConflictCode.SIGN_OUT_BEFORE_VERIFY,
      ),
    );
    expect(emailVerification.verify).not.toHaveBeenCalled();
    expect(sessions.establish).not.toHaveBeenCalled();
  });
});
