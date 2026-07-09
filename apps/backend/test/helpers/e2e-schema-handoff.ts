import { randomBytes } from 'crypto';
import { join } from 'path';

export function createSchemaHandoffPath(testDir: string): string {
  const runId = `${process.pid}_${randomBytes(4).toString('hex')}`;
  return join(testDir, `.e2e-schema-${runId}`);
}
