import { join } from 'path';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { Company } from '../companies/companies.entity';
import { User } from '../users/users.entity';

function usePostgres(): boolean {
  return Boolean(process.env.DATABASE_URL?.trim());
}

function postgresSsl(): { rejectUnauthorized: false } | undefined {
  const url = process.env.DATABASE_URL ?? '';
  if (
    url.includes('neon.tech') ||
    url.includes('sslmode=require') ||
    url.includes('render.com')
  ) {
    return { rejectUnauthorized: false };
  }
  return undefined;
}

export function buildTypeOrmOptions(): TypeOrmModuleOptions {
  if (usePostgres()) {
    const schema =
      process.env.NODE_ENV === 'test'
        ? process.env.DATABASE_SCHEMA?.trim()
        : undefined;
    return {
      type: 'postgres',
      url: process.env.DATABASE_URL,
      entities: [User, Company],
      synchronize: false,
      ssl: postgresSsl(),
      migrations: [join(__dirname, '..', 'migrations', '*.{js,ts}')],
      migrationsRun: process.env.RUN_MIGRATIONS === 'true',
      ...(schema
        ? {
            schema,
            extra: { options: `-c search_path=${schema},public` },
          }
        : {}),
    };
  }

  return {
    type: 'sqlite',
    database: process.env.DATABASE_PATH ?? 'db.sqlite',
    entities: [User, Company],
    synchronize: process.env.NODE_ENV !== 'production',
  };
}
