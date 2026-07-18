import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import type { Request } from 'express';
import type { SessionData } from '../../types/session.types';
import { MembershipRole } from '../membership-role';
import type { SessionPrincipal } from '../session-principal';
import { SessionsService } from '../sessions.service';
import { SessionAuthGuard } from './session-auth.guard';

function contextFor(request: Request): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => request }),
  } as ExecutionContext;
}

describe('SessionAuthGuard', () => {
  const session = {} as SessionData;

  it('maps a missing principal to unauthorized', async () => {
    const sessions = {
      authenticate: jest.fn().mockResolvedValue(null),
    } as unknown as SessionsService;
    const guard = new SessionAuthGuard(sessions);

    await expect(
      guard.canActivate(contextFor({ session } as Request)),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('stores the authenticated principal on the request', async () => {
    const principal: SessionPrincipal = {
      id: 'user-1',
      companyId: 'company-1',
      role: MembershipRole.ADMIN,
    };
    const sessions = {
      authenticate: jest.fn().mockResolvedValue(principal),
    } as unknown as SessionsService;
    const guard = new SessionAuthGuard(sessions);
    const request = { session } as Request & {
      principal?: SessionPrincipal;
    };

    await expect(guard.canActivate(contextFor(request))).resolves.toBe(true);
    expect(request.principal).toBe(principal);
  });
});
