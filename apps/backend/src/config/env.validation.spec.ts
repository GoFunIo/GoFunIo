import { validateDatabaseEnv, validateEnv } from './env.validation';

const validEnv = {
  NODE_ENV: 'production',
  COOKIE_KEY: 'a'.repeat(32),
  FRONTEND_URL: 'https://app.example.com',
  MAIL_TRANSPORT: 'resend',
  RESEND_API_KEY: 're_test',
  MAIL_FROM: 'test@example.com',
  DATABASE_URL: 'postgresql://user:pass@localhost:5432/app',
  GOOGLE_CLIENT_ID: 'google-client-id',
  ATTACHMENT_STORAGE_DRIVER: 's3',
  ATTACHMENT_STORAGE_ENDPOINT: 'https://storage.internal.example.com',
  ATTACHMENT_STORAGE_PUBLIC_ENDPOINT: 'https://storage.example.com',
  ATTACHMENT_STORAGE_REGION: 'auto',
  ATTACHMENT_STORAGE_BUCKET: 'attachments',
  ATTACHMENT_STORAGE_ACCESS_KEY_ID: 'storage-access-key',
  ATTACHMENT_STORAGE_SECRET_ACCESS_KEY: 'storage-secret-key',
  ATTACHMENT_STORAGE_FORCE_PATH_STYLE: 'false',
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

  it('accepts memory storage only in tests', () => {
    expect(
      validateEnv({
        ...validEnv,
        NODE_ENV: 'test',
        ATTACHMENT_STORAGE_DRIVER: 'memory',
        ATTACHMENT_STORAGE_ENDPOINT: undefined,
        ATTACHMENT_STORAGE_PUBLIC_ENDPOINT: undefined,
        ATTACHMENT_STORAGE_REGION: undefined,
        ATTACHMENT_STORAGE_BUCKET: undefined,
        ATTACHMENT_STORAGE_ACCESS_KEY_ID: undefined,
        ATTACHMENT_STORAGE_SECRET_ACCESS_KEY: undefined,
        ATTACHMENT_STORAGE_FORCE_PATH_STYLE: undefined,
      }),
    ).toMatchObject({ ATTACHMENT_STORAGE_DRIVER: 'memory' });
  });

  it('accepts SMTP without a Resend API key', () => {
    expect(
      validateEnv({
        ...validEnv,
        MAIL_TRANSPORT: 'smtp',
        RESEND_API_KEY: undefined,
        MAIL_SMTP_HOST: 'localhost',
        MAIL_SMTP_PORT: '1025',
      }),
    ).toMatchObject({
      MAIL_TRANSPORT: 'smtp',
      MAIL_SMTP_HOST: 'localhost',
      MAIL_SMTP_PORT: 1025,
    });
  });

  it('defaults to Resend for existing deployments', () => {
    const legacyEnv: Record<string, unknown> = { ...validEnv };
    delete legacyEnv.MAIL_TRANSPORT;
    expect(validateEnv(legacyEnv)).toMatchObject({
      MAIL_TRANSPORT: 'resend',
      RESEND_API_KEY: 're_test',
    });
  });

  it('requires the selected transport configuration', () => {
    expect(() =>
      validateEnv({ ...validEnv, RESEND_API_KEY: undefined }),
    ).toThrow('RESEND_API_KEY');
    expect(() =>
      validateEnv({
        ...validEnv,
        MAIL_TRANSPORT: 'smtp',
        RESEND_API_KEY: undefined,
      }),
    ).toThrow('MAIL_SMTP_HOST, MAIL_SMTP_PORT');
  });

  it('rejects memory storage outside tests', () => {
    expect(() =>
      validateEnv({ ...validEnv, ATTACHMENT_STORAGE_DRIVER: 'memory' }),
    ).toThrow('ATTACHMENT_STORAGE_DRIVER');
  });

  it('requires complete S3 configuration without exposing credentials', () => {
    let error: Error | undefined;
    try {
      validateEnv({
        ...validEnv,
        ATTACHMENT_STORAGE_ENDPOINT: undefined,
        ATTACHMENT_STORAGE_SECRET_ACCESS_KEY: 'must-not-leak',
      });
    } catch (caught) {
      error = caught as Error;
    }

    expect(error?.message).toContain('ATTACHMENT_STORAGE_ENDPOINT');
    expect(error?.message).not.toContain('must-not-leak');
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
    [{ MAIL_TRANSPORT: 'mailpit' }, 'MAIL_TRANSPORT'],
    [
      {
        MAIL_TRANSPORT: 'smtp',
        RESEND_API_KEY: undefined,
        MAIL_SMTP_HOST: 'localhost',
        MAIL_SMTP_PORT: 0,
      },
      'MAIL_SMTP_PORT',
    ],
    [
      { ATTACHMENT_STORAGE_FORCE_PATH_STYLE: 'yes' },
      'ATTACHMENT_STORAGE_FORCE_PATH_STYLE',
    ],
    [
      { ATTACHMENT_STORAGE_PUBLIC_ENDPOINT: 'not-a-url' },
      'ATTACHMENT_STORAGE_PUBLIC_ENDPOINT',
    ],
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
