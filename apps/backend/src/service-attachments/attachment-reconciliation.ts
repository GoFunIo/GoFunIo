import { Inject, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import {
  ATTACHMENT_OBJECT_STORE,
  type AttachmentObjectStore,
} from '../attachment-storage/attachment-object-store';

import { AttachmentObjectCleanup } from './attachment-object-cleanup.entity';
import { ServiceAttachment } from './service-attachment.entity';

const ATTACHMENT_PREFIX = 'service-attachments/';
const ORPHAN_GRACE_MS = 24 * 60 * 60 * 1000;

export interface AttachmentReconciliationSummary {
  scanned: number;
  referenced: number;
  pendingCleanup: number;
  tooYoung: number;
  orphaned: number;
  deleted: number;
}

@Injectable()
export class AttachmentReconciliation {
  private readonly logger = new Logger(AttachmentReconciliation.name);

  constructor(
    @InjectRepository(ServiceAttachment)
    private readonly attachments: Repository<ServiceAttachment>,
    @InjectRepository(AttachmentObjectCleanup)
    private readonly cleanups: Repository<AttachmentObjectCleanup>,
    @Inject(ATTACHMENT_OBJECT_STORE)
    private readonly objects: AttachmentObjectStore,
  ) {}

  async run(options: {
    deleteOrphans: boolean;
    now?: Date;
  }): Promise<AttachmentReconciliationSummary> {
    const [attachments, cleanups] = await Promise.all([
      this.attachments.find({
        select: ['objectKey'],
        where: { deletedAt: IsNull() },
      }),
      this.cleanups.find({
        select: ['objectKey'],
        where: { completedAt: IsNull() },
      }),
    ]);
    const referencedKeys = new Set(
      attachments.map(({ objectKey }) => objectKey),
    );
    const pendingKeys = new Set(cleanups.map(({ objectKey }) => objectKey));
    const cutoff = new Date(
      (options.now ?? new Date()).getTime() - ORPHAN_GRACE_MS,
    );
    const summary: AttachmentReconciliationSummary = {
      scanned: 0,
      referenced: 0,
      pendingCleanup: 0,
      tooYoung: 0,
      orphaned: 0,
      deleted: 0,
    };

    let cursor: string | undefined;
    do {
      const page = await this.objects.list({
        prefix: ATTACHMENT_PREFIX,
        cursor,
      });
      for (const object of page.objects) {
        summary.scanned += 1;
        if (referencedKeys.has(object.key)) {
          summary.referenced += 1;
        } else if (pendingKeys.has(object.key)) {
          summary.pendingCleanup += 1;
        } else if (object.lastModified > cutoff) {
          summary.tooYoung += 1;
        } else {
          summary.orphaned += 1;
          if (options.deleteOrphans) {
            await this.objects.delete(object.key);
            summary.deleted += 1;
          }
        }
      }
      cursor = page.nextCursor;
    } while (cursor);

    this.logger.log(
      JSON.stringify({
        event: 'attachment_reconciliation_completed',
        mode: options.deleteOrphans ? 'delete' : 'dry-run',
        ...summary,
      }),
    );
    return summary;
  }
}
