import type { SessionData } from '../types/session.types';
import { MembershipRole } from './membership-role';
import type { SessionUserReader } from './session-user-reader';
import { SessionsService } from './sessions.service';

describe('SessionsService', () => {
  const user = {
    id: 'user-1',
    companyId: 'company-1',
    role: MembershipRole.ADMIN,
    passwordVersion: 3,
  };

  it('establishes a session for an active user', async () => {
    const reader: SessionUserReader = {
      findActiveById: jest.fn().mockResolvedValue(user),
    };
    const service = new SessionsService(reader);
    const session = {} as SessionData;

    await expect(service.establish(session, user.id)).resolves.toEqual({
      id: user.id,
      companyId: user.companyId,
      role: user.role,
    });

    expect(reader.findActiveById).toHaveBeenCalledWith(user.id);
    expect(session.userId).toBe(user.id);
    expect(session.passwordVersion).toBe(user.passwordVersion);
    expect(session.currentCompanyId).toBe(user.companyId);
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

  it('authenticates a current session', async () => {
    const reader: SessionUserReader = {
      findActiveById: jest.fn().mockResolvedValue(user),
    };
    const service = new SessionsService(reader);
    const session = {
      userId: user.id,
      passwordVersion: user.passwordVersion,
      currentCompanyId: user.companyId,
    } as SessionData;

    await expect(service.authenticate(session)).resolves.toEqual({
      id: user.id,
      companyId: user.companyId,
      role: user.role,
    });
  });

  it('clears the session when the user is missing', async () => {
    const reader: SessionUserReader = {
      findActiveById: jest.fn().mockResolvedValue(null),
    };
    const service = new SessionsService(reader);
    const session = {
      userId: user.id,
      passwordVersion: user.passwordVersion,
      currentCompanyId: user.companyId,
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
      currentCompanyId: user.companyId,
    } as SessionData;

    await expect(service.authenticate(session)).resolves.toBeNull();
    expect(session.userId).toBeNull();
  });

  it('does not authenticate a session without the current company', async () => {
    const reader: SessionUserReader = {
      findActiveById: jest.fn().mockResolvedValue(user),
    };
    const service = new SessionsService(reader);
    const session = {
      userId: user.id,
      passwordVersion: user.passwordVersion,
    } as SessionData;

    await expect(service.authenticate(session)).resolves.toBeNull();
  });

  it('clears a session', () => {
    const service = new SessionsService({ findActiveById: jest.fn() });
    const session = {
      userId: user.id,
      passwordVersion: user.passwordVersion,
      currentCompanyId: user.companyId,
    } as SessionData;

    service.clear(session);

    expect(session.userId).toBeNull();
    expect(session.passwordVersion).toBeNull();
    expect(session.currentCompanyId).toBeNull();
  });
});
