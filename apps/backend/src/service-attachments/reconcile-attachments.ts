import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AttachmentReconciliationModule } from './attachment-reconciliation.module';
import { AttachmentReconciliation } from './attachment-reconciliation';

const logger = new Logger('AttachmentReconciliationCommand');

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  if (args.some((arg) => arg !== '--delete')) {
    throw new Error(
      'Usage: pnpm --filter backend attachments:reconcile [--delete]',
    );
  }

  const context = await NestFactory.createApplicationContext(
    AttachmentReconciliationModule,
    { logger: ['error', 'warn'] },
  );
  try {
    const summary = await context
      .get(AttachmentReconciliation)
      .run({ deleteOrphans: args.includes('--delete') });
    process.stdout.write(`${JSON.stringify(summary)}\n`);
  } finally {
    await context.close();
  }
}

void main().catch((error: unknown) => {
  logger.error(
    JSON.stringify({
      event: 'attachment_reconciliation_failed',
      error: error instanceof Error ? error.message : String(error),
    }),
  );
  process.exitCode = 1;
});
