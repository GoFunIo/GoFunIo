import { resolve } from 'path';
import { DataSource } from 'typeorm';
import { Company } from './companies/companies.entity';
import { User } from './users/users.entity';
import { Vehicle } from './vehicles/vehicles.entity';
import { ManagerVehicleAssignment } from './vehicles/manager-vehicle-assignment.entity';
import { Driver } from './drivers/drivers.entity';
import { DriverVehicleAssignment } from './drivers/driver-vehicle-assignment.entity';

const databaseUrl = process.env.DATABASE_URL?.trim();
if (!databaseUrl) {
  throw new Error(
    'DATABASE_URL is required for migrations. Provide it via env (--env-file=.env or shell export).',
  );
}

const needsSsl =
  databaseUrl.includes('neon.tech') ||
  databaseUrl.includes('sslmode=require') ||
  databaseUrl.includes('render.com');

export default new DataSource({
  type: 'postgres',
  url: databaseUrl,
  ssl: needsSsl ? { rejectUnauthorized: false } : undefined,
  entities: [
    User,
    Company,
    Vehicle,
    ManagerVehicleAssignment,
    Driver,
    DriverVehicleAssignment,
  ],
  migrations: [resolve(__dirname, 'migrations', '*.{ts,js}')],
  synchronize: false,
});
