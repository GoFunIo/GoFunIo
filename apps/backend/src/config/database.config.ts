import { join } from 'path';
import type { DataSourceOptions } from 'typeorm';
import type { DatabaseEnv } from './env.validation';

type PostgresOptions = Extract<DataSourceOptions, { type: 'postgres' }>;

export function buildTypeOrmOptions(env: DatabaseEnv): PostgresOptions {
  const schema = env.DATABASE_SCHEMA?.trim();
  return {
    type: 'postgres',
    url: env.DATABASE_URL,
    synchronize: false,
    ssl:
      env.DATABASE_SSL === 'true'
        ? {
            rejectUnauthorized: env.DATABASE_SSL_REJECT_UNAUTHORIZED === 'true',
          }
        : false,
    migrations: [join(__dirname, '..', 'migrations', '*.{js,ts}')],
    migrationsRun: env.RUN_MIGRATIONS === 'true',
    ...(schema
      ? {
          schema,
          extra: { options: `-c search_path=${schema},public` },
        }
      : {}),
  };
}
