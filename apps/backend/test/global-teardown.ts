import { existsSync, readFileSync, unlinkSync } from 'fs';
import { dropTestSchema } from './helpers/test-db';

export default async function globalTeardown(): Promise<void> {
  const schemaFile = process.env.E2E_SCHEMA_FILE;
  if (!schemaFile || !existsSync(schemaFile)) {
    return;
  }

  const schema = readFileSync(schemaFile, 'utf8').trim();
  if (schema) {
    await dropTestSchema(schema);
  }
  unlinkSync(schemaFile);
}
