import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';
import { resolveAllowedOrigins } from './allowed-origins';

@Injectable()
export class AllowedOriginGuard implements CanActivate {
  constructor(private config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    if (this.config.get<string>('NODE_ENV') !== 'production') {
      return true;
    }

    const origin = context.switchToHttp().getRequest<Request>().get('origin');
    const allowed = resolveAllowedOrigins(
      this.config.getOrThrow<string>('FRONTEND_URL'),
      this.config.get<string>('CORS_ORIGINS'),
    );

    if (!origin || !allowed.includes(origin)) {
      throw new ForbiddenException('Origin not allowed');
    }

    return true;
  }
}
