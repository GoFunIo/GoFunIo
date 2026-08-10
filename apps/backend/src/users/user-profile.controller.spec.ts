import type { SessionData } from '../types/session.types';
import { UserProfileController } from './user-profile.controller';
import { MembershipRole } from './membership-role';

describe('UserProfileController', () => {
  it('composes an updated account with the active workspace context', async () => {
    const account = {
      id: 'user-1',
      email: 'user@example.com',
      firstName: 'Jan',
      lastName: null,
      phone: null,
      address: null,
      postalCode: null,
      city: null,
      pendingEmail: null,
      hasPassword: true,
    };
    const userProfiles = {
      get: jest.fn(),
      update: jest.fn().mockResolvedValue(account),
    };
    const controller = new UserProfileController(
      userProfiles,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
    );
    const principal = {
      id: account.id,
      companyId: 'company-1',
      role: MembershipRole.ADMIN,
    };

    await expect(
      controller.updateProfile(principal, { firstName: 'Jan' }),
    ).resolves.toEqual({
      ...account,
      companyId: principal.companyId,
      role: principal.role,
    });
  });

  it('refreshes the session with the password version returned by CAS', async () => {
    const credentials = {
      changePassword: jest.fn().mockResolvedValue(4),
    };
    const sessions = { establish: jest.fn() };
    const controller = new UserProfileController(
      {} as never,
      sessions as never,
      {} as never,
      credentials as never,
      {} as never,
    );
    const principal = {
      id: 'user-1',
      companyId: 'company-1',
      role: MembershipRole.ADMIN,
    };
    const session = {} as SessionData;

    await controller.changePassword(
      principal,
      { currentPassword: 'old-password', newPassword: 'new-password' },
      session,
    );

    expect(credentials.changePassword).toHaveBeenCalledWith(
      principal.id,
      'old-password',
      'new-password',
    );
    expect(sessions.establish).toHaveBeenCalledWith(session, principal.id, 4);
  });
});
