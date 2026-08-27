import {
  AttachmentStorageInconsistentError,
  AttachmentStorageUnavailableError,
} from './attachment-object-store';
import { InMemoryAttachmentObjectStore } from './in-memory-attachment-object-store';

describe('InMemoryAttachmentObjectStore', () => {
  it('implements put, verified download, paginated list, and idempotent delete', async () => {
    const store = new InMemoryAttachmentObjectStore({ pageSize: 1 });
    const firstKey = 'service-attachments/company/service/a.pdf';
    const secondKey = 'service-attachments/company/service/b.pdf';

    await store.put({
      key: firstKey,
      body: Buffer.from('first'),
      mimeType: 'application/pdf',
    });
    await store.put({
      key: secondKey,
      body: Buffer.from('second'),
      mimeType: 'application/pdf',
    });

    const download = await store.createReadUrl({
      key: firstKey,
      fileName: 'invoice.pdf',
      expiresInSeconds: 300,
      disposition: 'attachment',
    });
    expect(download.protocol).toBe('memory:');

    const firstPage = await store.list({ prefix: 'service-attachments/' });
    expect(firstPage.objects).toEqual([
      expect.objectContaining({ key: firstKey, size: 5 }),
    ]);
    expect(firstPage.nextCursor).toBeDefined();

    const secondPage = await store.list({
      prefix: 'service-attachments/',
      cursor: firstPage.nextCursor,
    });
    expect(secondPage.objects).toEqual([
      expect.objectContaining({ key: secondKey, size: 6 }),
    ]);
    expect(secondPage.nextCursor).toBeUndefined();

    await store.delete(firstKey);
    await store.delete(firstKey);
    await expect(
      store.createReadUrl({
        key: firstKey,
        fileName: 'invoice.pdf',
        expiresInSeconds: 300,
        disposition: 'attachment',
      }),
    ).rejects.toBeInstanceOf(AttachmentStorageInconsistentError);
  });

  it('injects the next operation failure deterministically', async () => {
    const store = new InMemoryAttachmentObjectStore();
    store.failNext('put');

    await expect(
      store.put({ key: 'key', body: Buffer.from('x'), mimeType: 'image/png' }),
    ).rejects.toBeInstanceOf(AttachmentStorageUnavailableError);

    await expect(
      store.put({ key: 'key', body: Buffer.from('x'), mimeType: 'image/png' }),
    ).resolves.toBeUndefined();
  });
});
