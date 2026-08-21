import type { Repository } from 'typeorm';
import type { AttachmentObjectStore } from '../attachment-storage/attachment-object-store';
import { AttachmentObjectCleanup } from './attachment-object-cleanup.entity';
import {
  AttachmentReconciliation,
  type AttachmentReconciliationSummary,
} from './attachment-reconciliation';
import { ServiceAttachment } from './service-attachment.entity';

describe('AttachmentReconciliation', () => {
  it('paginates and deletes only old unreferenced objects when explicitly enabled', async () => {
    const now = new Date('2026-08-21T12:00:00Z');
    const objects = [
      object('service-attachments/active', '2026-08-01T00:00:00Z'),
      object('service-attachments/pending', '2026-08-01T00:00:00Z'),
      object('service-attachments/young', '2026-08-21T11:00:00Z'),
      object('service-attachments/orphan', '2026-08-01T00:00:00Z'),
    ];
    const list = jest.fn(({ cursor }: { cursor?: string }) =>
      Promise.resolve(
        cursor
          ? { objects: objects.slice(2) }
          : { objects: objects.slice(0, 2), nextCursor: 'page-2' },
      ),
    );
    const deleteObject = jest.fn().mockResolvedValue(undefined);
    const store = {
      list,
      delete: deleteObject,
    } as unknown as AttachmentObjectStore;
    const reconciliation = new AttachmentReconciliation(
      repository<ServiceAttachment>([
        { objectKey: 'service-attachments/active' } as ServiceAttachment,
      ]),
      repository<AttachmentObjectCleanup>([
        { objectKey: 'service-attachments/pending' } as AttachmentObjectCleanup,
      ]),
      store,
    );
    const expected: AttachmentReconciliationSummary = {
      scanned: 4,
      referenced: 1,
      pendingCleanup: 1,
      tooYoung: 1,
      orphaned: 1,
      deleted: 0,
    };

    await expect(
      reconciliation.run({ deleteOrphans: false, now }),
    ).resolves.toEqual(expected);
    expect(deleteObject).not.toHaveBeenCalled();

    await expect(
      reconciliation.run({ deleteOrphans: true, now }),
    ).resolves.toEqual({ ...expected, deleted: 1 });
    expect(deleteObject).toHaveBeenCalledWith('service-attachments/orphan');
  });
});

function repository<T extends object>(rows: T[]): Repository<T> {
  return {
    find: jest.fn().mockResolvedValue(rows),
  } as unknown as Repository<T>;
}

function object(key: string, lastModified: string) {
  return { key, size: 1, lastModified: new Date(lastModified) };
}
