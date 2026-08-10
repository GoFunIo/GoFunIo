import { validateEnv } from './env.validation';

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
      CORS_ORIGINS: ['https://app.example.com', 'https://admin.example.com'],
      FRONTEND_URL_PATTERNS: [expect.any(RegExp)],
    });
  });

  it.each([
    [{ COOKIE_KEY: 'short' }, 'COOKIE_KEY'],
    [{ RUN_MIGRATIONS: 'yes' }, 'RUN_MIGRATIONS'],
    [{ CORS_ORIGINS: 'https://app.example.com/path' }, 'Invalid CORS origin'],
    [{ FRONTEND_URL_PATTERNS: '[' }, 'Invalid FRONTEND_URL_PATTERNS entry'],
  ])('rejects invalid environment values', (override, message) => {
    expect(() => validateEnv({ ...validEnv, ...override })).toThrow(message);
  });
});
