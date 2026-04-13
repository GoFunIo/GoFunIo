import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { SessionData } from '../../types/session.types';
import { User } from '../users.entity';

export const CurrentUser = createParamDecorator(
  (data: never, ctx: ExecutionContext) => {
    const request = ctx
      .switchToHttp()
      .getRequest<Request & { session: SessionData & { user: User } }>();

    return request.session.user;
  },
);
