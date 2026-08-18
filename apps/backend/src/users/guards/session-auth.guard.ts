import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';
import type { SessionData } from '../../types/session.types';
import type { SessionPrincipal } from '../session-principal';
import { SessionsService } from '../sessions.service';

type AuthenticatedRequest = Request & {
  session: SessionData;
  principal?: SessionPrincipal;
};

@Injectable()
export class SessionAuthGuard implements CanActivate {
  constructor(private readonly sessions: SessionsService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const principal = await this.sessions.authenticate(request.session);

    if (!principal) throw new UnauthorizedException();

    request.principal = principal;
    return true;
  }
}
