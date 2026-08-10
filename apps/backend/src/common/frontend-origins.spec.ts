import { ConfigService } from '@nestjs/config';
import { EnvVars, NodeEnv } from '../config/env.validation';
import { ConfiguredFrontendOrigins } from './frontend-origins';

function origins(overrides: Partial<EnvVars> = {}) {
  const values: EnvVars = {
    NODE_ENV: NodeEnv.Production,
    COOKIE_KEY: 'a'.repeat(32),
    FRONTEND_URL: 'https://app.example.com/base/',
    RESEND_API_KEY: 'resend',
    MAIL_FROM: 'mail@example.com',
    DATABASE_URL: 'postgres://localhost/database',
    CORS_ORIGINS: [],
    FRONTEND_URL_PATTERNS: [],
    GOOGLE_CLIENT_ID: 'google',
    VERIFICATION_TOKEN_TTL_HOURS: 24,
    PASSWORD_RESET_TOKEN_TTL_HOURS: 24,
    ...overrides,
  };
  return new ConfiguredFrontendOrigins({
    get: (key: keyof EnvVars) => values[key],
  } as ConfigService<EnvVars, true>);
}

describe('FrontendOrigins', () => {
  it('uses exact CORS origins or the frontend origin as fallback', () => {
    expect(origins().corsOrigins).toEqual(['https://app.example.com']);
    expect(
      origins({ CORS_ORIGINS: ['https://admin.example.com'] }).corsOrigins,
    ).toEqual(['https://admin.example.com']);
  });

  it('allows only configured production mutation origins', () => {
    const policy = origins({
      CORS_ORIGINS: ['https://admin.example.com'],
    });
    expect(policy.allowsMutation('https://admin.example.com')).toBe(true);
    expect(policy.allowsMutation('https://app.example.com')).toBe(false);
    expect(policy.allowsMutation()).toBe(false);
    expect(origins({ NODE_ENV: NodeEnv.Development }).allowsMutation()).toBe(
      true,
    );
  });

  it('accepts exact and pattern link origins and rejects unsafe candidates', () => {
    const policy = origins({
      FRONTEND_URL_PATTERNS: [/^https:\/\/preview-\d+\.example\.com$/],
    });
    expect(policy.resolveLinkBase('https://app.example.com')).toBe(
      'https://app.example.com',
    );
    expect(policy.resolveLinkBase('https://preview-12.example.com')).toBe(
      'https://preview-12.example.com',
    );
    expect(policy.resolveLinkBase('https://preview-12.example.com/path')).toBe(
      'https://app.example.com/base',
    );
    expect(policy.resolveLinkBase('https://evil.example')).toBe(
      'https://app.example.com/base',
    );
    expect(policy.resolveLinkBase()).toBe('https://app.example.com/base');
  });
});
