import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';
import type { SessionData } from '../../types/session.types';
import { User } from '../users.entity';
import { UsersService } from '../users.service';

type AuthenticatedRequest = Request & {
  session: SessionData;
  user?: User;
};

@Injectable()
export class SessionAuthGuard implements CanActivate {
  constructor(private usersService: UsersService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const { session } = request;
    const user = session.userId
      ? await this.usersService.findActiveById(session.userId)
      : null;

    if (!user || session.passwordVersion !== user.passwordVersion) {
      session.userId = null;
      session.passwordVersion = null;
      throw new UnauthorizedException();
    }

    request.user = user;
    return true;
  }
}
