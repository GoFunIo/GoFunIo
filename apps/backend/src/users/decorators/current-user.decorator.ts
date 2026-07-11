import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import { User } from '../users.entity';

export const CurrentUser = createParamDecorator(
  (data: never, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<Request & { user: User }>();

    return request.user;
  },
);
