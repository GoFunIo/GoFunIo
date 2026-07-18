import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import type { Request } from 'express';
import { MembershipRole } from '../membership-role';
import type { SessionPrincipal } from '../session-principal';

@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const principal = context
      .switchToHttp()
      .getRequest<Request & { principal: SessionPrincipal }>().principal;
    if (principal.role !== MembershipRole.ADMIN) {
      throw new ForbiddenException();
    }
    return true;
  }
}
