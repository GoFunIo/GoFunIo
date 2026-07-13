import { join } from 'path';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { Company } from '../companies/companies.entity';
import { User } from '../users/users.entity';
import { Vehicle } from '../vehicles/vehicles.entity';

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
  const schema =
    process.env.NODE_ENV === 'test'
      ? process.env.DATABASE_SCHEMA?.trim()
      : undefined;
  return {
    type: 'postgres',
    url: process.env.DATABASE_URL,
    entities: [User, Company, Vehicle],
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
