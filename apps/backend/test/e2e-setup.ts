import { existsSync, readFileSync } from 'fs';
import './helpers/test-env';
import { truncateTestTables } from './helpers/test-db';

function resolveDatabaseSchema(): string {
  const fromEnv = process.env.DATABASE_SCHEMA?.trim();
  if (fromEnv) {
    return fromEnv;
  }

  const schemaFile = process.env.E2E_SCHEMA_FILE;
  if (!schemaFile || !existsSync(schemaFile)) {
    throw new Error(
      'Missing e2e schema handoff. Run tests via `npm run test:e2e`, not `npm test`.',
    );
  }

  return readFileSync(schemaFile, 'utf8').trim();
}

beforeAll(() => {
  process.env.DATABASE_SCHEMA = resolveDatabaseSchema();
});

beforeEach(async () => {
  await truncateTestTables();
});
