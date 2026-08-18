import { validateDatabaseEnv, validateEnv } from './env.validation';

const validEnv = {
  NODE_ENV: 'production',
  COOKIE_KEY: 'a'.repeat(32),
  FRONTEND_URL: 'https://app.example.com',
  RESEND_API_KEY: 're_test',
  MAIL_FROM: 'test@example.com',
  DATABASE_URL: 'postgresql://user:pass@localhost:5432/app',
  GOOGLE_CLIENT_ID: 'google-client-id',
};

describe('validateEnv', () => {
  it('accepts valid security configuration', () => {
    expect(
      validateEnv({
        ...validEnv,
        CORS_ORIGINS: 'https://app.example.com, https://admin.example.com',
        FRONTEND_URL_PATTERNS: '^https://preview-[0-9]+\\.example\\.com$',
      }),
    ).toMatchObject({
      PORT: 3000,
      DATABASE_SSL: 'false',
      DATABASE_SSL_REJECT_UNAUTHORIZED: 'true',
      RUN_MIGRATIONS: 'false',
      CORS_ORIGINS: ['https://app.example.com', 'https://admin.example.com'],
      FRONTEND_URL_PATTERNS: [expect.any(RegExp)],
    });
  });

  it.each([
    [{ COOKIE_KEY: 'short' }, 'COOKIE_KEY'],
    [{ RUN_MIGRATIONS: 'yes' }, 'RUN_MIGRATIONS'],
    [{ DATABASE_SSL: 'yes' }, 'DATABASE_SSL'],
    [
      { DATABASE_SSL_REJECT_UNAUTHORIZED: 'yes' },
      'DATABASE_SSL_REJECT_UNAUTHORIZED',
    ],
    [{ DATABASE_SCHEMA: 'bad-schema' }, 'DATABASE_SCHEMA'],
    [{ PORT: 0 }, 'PORT'],
    [{ CORS_ORIGINS: 'https://app.example.com/path' }, 'Invalid CORS origin'],
    [{ FRONTEND_URL_PATTERNS: '[' }, 'Invalid FRONTEND_URL_PATTERNS entry'],
  ])('rejects invalid environment values', (override, message) => {
    expect(() => validateEnv({ ...validEnv, ...override })).toThrow(message);
  });
});

describe('validateDatabaseEnv', () => {
  it('validates database settings without requiring application secrets', () => {
    expect(
      validateDatabaseEnv({
        DATABASE_URL: validEnv.DATABASE_URL,
        DATABASE_SCHEMA: 'tenant_test',
        DATABASE_SSL: 'true',
        DATABASE_SSL_REJECT_UNAUTHORIZED: 'false',
      }),
    ).toMatchObject({
      DATABASE_SCHEMA: 'tenant_test',
      DATABASE_SSL: 'true',
      DATABASE_SSL_REJECT_UNAUTHORIZED: 'false',
      RUN_MIGRATIONS: 'false',
    });
  });

  it('rejects missing database URL', () => {
    expect(() => validateDatabaseEnv({})).toThrow('DATABASE_URL');
  });
});
