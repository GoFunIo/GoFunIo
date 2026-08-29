import { DocumentBuilder } from '@nestjs/swagger';

export const createSwaggerConfig = () =>
  new DocumentBuilder()
    .setTitle('GoFunIo API')
    .setDescription(
      'Manual testing: sign in to receive the HttpOnly `session` cookie, then call protected endpoints in the same browser. Use IDs returned by list/create operations. Mutations require an allowed browser Origin in production and may require ADMIN or OWNER role.',
    )
    .setVersion('1.0')
    .addCookieAuth('session', undefined, 'session')
    .build();
