import type { SessionData } from '../types/session.types';
import { MembershipRole } from './membership-role';
import type { SessionUserReader } from './session-user-reader';
import { SessionsService } from './sessions.service';

describe('SessionsService', () => {
  const user = {
    id: 'user-1',
    passwordVersion: 3,
    memberships: [
      { companyId: 'company-1', role: MembershipRole.ADMIN },
      { companyId: 'company-2', role: MembershipRole.MANAGER },
    ],
  };

  it('establishes a session on the oldest active membership', async () => {
    const findActiveById = jest.fn().mockResolvedValue(user);
    const reader: SessionUserReader = {
      findActiveById,
    };
    const service = new SessionsService(reader);
    const session = {} as SessionData;

    await expect(service.establish(session, user.id)).resolves.toEqual({
      id: user.id,
      companyId: 'company-1',
      role: MembershipRole.ADMIN,
    });

    expect(findActiveById).toHaveBeenCalledWith(user.id);
    expect(session.userId).toBe(user.id);
    expect(session.passwordVersion).toBe(user.passwordVersion);
    expect(session.currentCompanyId).toBe('company-1');
  });

  it('establishes a session without company for a user without memberships', async () => {
    const reader: SessionUserReader = {
      findActiveById: jest.fn().mockResolvedValue({ ...user, memberships: [] }),
    };
    const service = new SessionsService(reader);
    const session = {} as SessionData;

    await expect(service.establish(session, user.id)).resolves.toEqual({
      id: user.id,
      companyId: null,
      role: null,
    });
    expect(session.userId).toBe(user.id);
    expect(session.currentCompanyId).toBeNull();
  });

  it('rejects a stale authenticated password version', async () => {
    const reader: SessionUserReader = {
      findActiveById: jest.fn().mockResolvedValue(user),
    };
    const service = new SessionsService(reader);
    const session = {} as SessionData;

    await expect(
      service.establish(session, user.id, user.passwordVersion - 1),
    ).rejects.toThrow('Credentials changed during authentication');
    expect(session.userId).toBeNull();
  });

  it('authenticates a session against the membership of the current company', async () => {
    const reader: SessionUserReader = {
      findActiveById: jest.fn().mockResolvedValue(user),
    };
    const service = new SessionsService(reader);
    const session = {
      userId: user.id,
      passwordVersion: user.passwordVersion,
      currentCompanyId: 'company-2',
    } as SessionData;

    await expect(service.authenticate(session)).resolves.toEqual({
      id: user.id,
      companyId: 'company-2',
      role: MembershipRole.MANAGER,
    });
  });

  it('authenticates a session without a current company', async () => {
    const reader: SessionUserReader = {
      findActiveById: jest.fn().mockResolvedValue({ ...user, memberships: [] }),
    };
    const service = new SessionsService(reader);
    const session = {
      userId: user.id,
      passwordVersion: user.passwordVersion,
      currentCompanyId: null,
    } as SessionData;

    await expect(service.authenticate(session)).resolves.toEqual({
      id: user.id,
      companyId: null,
      role: null,
    });
  });

  it('keeps authentication without switching to another workspace', async () => {
    const reader: SessionUserReader = {
      findActiveById: jest.fn().mockResolvedValue(user),
    };
    const service = new SessionsService(reader);
    const session = {
      userId: user.id,
      passwordVersion: user.passwordVersion,
      currentCompanyId: 'company-foreign',
    } as SessionData;

    await expect(service.authenticate(session)).resolves.toEqual({
      id: user.id,
      companyId: null,
      role: null,
    });
    expect(session.userId).toBe(user.id);
    expect(session.currentCompanyId).toBeNull();
  });

  it('keeps a zero-workspace user authenticated after removal', async () => {
    const reader: SessionUserReader = {
      findActiveById: jest.fn().mockResolvedValue({ ...user, memberships: [] }),
    };
    const service = new SessionsService(reader);
    const session = {
      userId: user.id,
      passwordVersion: user.passwordVersion,
      currentCompanyId: 'company-removed',
    } as SessionData;

    await expect(service.authenticate(session)).resolves.toEqual({
      id: user.id,
      companyId: null,
      role: null,
    });
    expect(session.userId).toBe(user.id);
    expect(session.currentCompanyId).toBeNull();
  });

  it('clears the session when the user is missing', async () => {
    const reader: SessionUserReader = {
      findActiveById: jest.fn().mockResolvedValue(null),
    };
    const service = new SessionsService(reader);
    const session = {
      userId: user.id,
      passwordVersion: user.passwordVersion,
      currentCompanyId: 'company-1',
    } as SessionData;

    await expect(service.authenticate(session)).resolves.toBeNull();
    expect(session.userId).toBeNull();
    expect(session.passwordVersion).toBeNull();
    expect(session.currentCompanyId).toBeNull();
  });

  it('clears the session when passwordVersion does not match', async () => {
    const reader: SessionUserReader = {
      findActiveById: jest.fn().mockResolvedValue(user),
    };
    const service = new SessionsService(reader);
    const session = {
      userId: user.id,
      passwordVersion: user.passwordVersion - 1,
      currentCompanyId: 'company-1',
    } as SessionData;

    await expect(service.authenticate(session)).resolves.toBeNull();
    expect(session.userId).toBeNull();
  });

  it('clears a session', () => {
    const service = new SessionsService({ findActiveById: jest.fn() });
    const session = {
      userId: user.id,
      passwordVersion: user.passwordVersion,
      currentCompanyId: 'company-1',
    } as SessionData;

    service.clear(session);

    expect(session.userId).toBeNull();
    expect(session.passwordVersion).toBeNull();
    expect(session.currentCompanyId).toBeNull();
  });
});
