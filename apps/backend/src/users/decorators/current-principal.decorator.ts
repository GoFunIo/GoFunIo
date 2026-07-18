import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import type { SessionPrincipal } from '../session-principal';

export const CurrentPrincipal = createParamDecorator(
  (_data: never, ctx: ExecutionContext) => {
    const request = ctx
      .switchToHttp()
      .getRequest<Request & { principal: SessionPrincipal }>();

    return request.principal;
  },
);
