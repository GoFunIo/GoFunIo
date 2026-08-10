import { buildTypeOrmOptions } from './database.config';
import type { DatabaseEnv } from './env.validation';

function env(overrides: Partial<DatabaseEnv> = {}): DatabaseEnv {
  return {
    DATABASE_URL: 'postgresql://localhost/app?sslmode=require',
    DATABASE_SSL: 'false',
    DATABASE_SSL_REJECT_UNAUTHORIZED: 'true',
    RUN_MIGRATIONS: 'false',
    ...overrides,
  };
}

describe('buildTypeOrmOptions', () => {
  it('uses only explicit SSL settings', () => {
    expect(buildTypeOrmOptions(env()).ssl).toBe(false);
    expect(buildTypeOrmOptions(env({ DATABASE_SSL: 'true' })).ssl).toEqual({
      rejectUnauthorized: true,
    });
    expect(
      buildTypeOrmOptions(
        env({
          DATABASE_SSL: 'true',
          DATABASE_SSL_REJECT_UNAUTHORIZED: 'false',
        }),
      ).ssl,
    ).toEqual({ rejectUnauthorized: false });
  });

  it('applies an optional schema and migration setting', () => {
    expect(
      buildTypeOrmOptions(
        env({ DATABASE_SCHEMA: 'test_schema', RUN_MIGRATIONS: 'true' }),
      ),
    ).toMatchObject({
      schema: 'test_schema',
      extra: { options: '-c search_path=test_schema,public' },
      migrationsRun: true,
    });
    expect(buildTypeOrmOptions(env())).not.toHaveProperty('schema');
  });
});
