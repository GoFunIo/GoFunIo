import { join } from 'path';
import { DataSource } from 'typeorm';
import { buildTypeOrmOptions } from './config/database.config';
import { validateDatabaseEnv } from './config/env.validation';

export default new DataSource({
  ...buildTypeOrmOptions(validateDatabaseEnv(process.env)),
  entities: [join(__dirname, '**', '*.entity.{ts,js}')],
});
