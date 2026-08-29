import { applyDecorators } from '@nestjs/common';
import { ApiCookieAuth, ApiHeader, ApiParam } from '@nestjs/swagger';

/** Marks an operation as requiring the browser session created by /auth/signin. */
export const ApiSessionAuth = () => ApiCookieAuth('session');

/** Documents the CSRF/origin check applied to state-changing browser requests. */
export const ApiAllowedOrigin = () =>
  applyDecorators(
    ApiHeader({
      name: 'Origin',
      required: true,
      description:
        'Required for this mutation in production. It must be an allowed frontend origin. Browsers set Origin themselves; Swagger UI is intended for local/development testing.',
      schema: {
        type: 'string',
        format: 'uri',
        example: 'http://localhost:5173',
      },
    }),
  );

export const ApiUuidParam = (
  name: string,
  description = 'Resource identifier',
) =>
  ApiParam({
    name,
    required: true,
    description,
    schema: {
      type: 'string',
      format: 'uuid',
      example: '7fd77abe-6a77-4cb7-9f7a-cf0b542643f5',
    },
  });
