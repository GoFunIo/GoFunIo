import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import type { Request } from 'express';
import { User, UserRole } from '../users.entity';

@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const user = context
      .switchToHttp()
      .getRequest<Request & { user: User }>().user;
    if (user.role !== UserRole.ADMIN) {
      throw new ForbiddenException();
    }
    return true;
  }
}
