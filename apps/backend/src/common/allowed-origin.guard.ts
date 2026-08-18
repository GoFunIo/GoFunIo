import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Inject,
  Injectable,
} from '@nestjs/common';
import type { Request } from 'express';
import { FRONTEND_ORIGINS, type FrontendOrigins } from './frontend-origins';

@Injectable()
export class AllowedOriginGuard implements CanActivate {
  constructor(
    @Inject(FRONTEND_ORIGINS) private readonly origins: FrontendOrigins,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const origin = context.switchToHttp().getRequest<Request>().get('origin');
    if (!this.origins.allowsMutation(origin)) {
      throw new ForbiddenException('Origin not allowed');
    }

    return true;
  }
}
