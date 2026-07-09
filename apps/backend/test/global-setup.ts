import { writeFileSync } from 'fs';
import { join } from 'path';
import { createTestSchema } from './helpers/test-db';
import { createSchemaHandoffPath } from './helpers/e2e-schema-handoff';

export default async function globalSetup(): Promise<void> {
  const schema = await createTestSchema();
  const schemaFile = createSchemaHandoffPath(__dirname);

  writeFileSync(schemaFile, schema, 'utf8');
  process.env.E2E_SCHEMA_FILE = schemaFile;
  process.env.DATABASE_SCHEMA = schema;
}
