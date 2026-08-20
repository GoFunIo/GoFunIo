import { randomUUID } from 'crypto';
import { AttachmentStorageInconsistentError } from '../../src/attachment-storage/attachment-object-store';
import { S3AttachmentObjectStore } from '../../src/attachment-storage/s3-attachment-object-store';

const prefix = `storage-contract/${randomUUID()}/`;
const firstKey = `${prefix}a.pdf`;
const secondKey = `${prefix}b.pdf`;
const store = new S3AttachmentObjectStore({
  endpoint: process.env.ATTACHMENT_STORAGE_ENDPOINT ?? 'http://localhost:9000',
  publicEndpoint:
    process.env.ATTACHMENT_STORAGE_PUBLIC_ENDPOINT ?? 'http://localhost:9000',
  region: process.env.ATTACHMENT_STORAGE_REGION ?? 'us-east-1',
  bucket: process.env.ATTACHMENT_STORAGE_BUCKET ?? 'gofunio-attachments-local',
  accessKeyId: process.env.ATTACHMENT_STORAGE_ACCESS_KEY_ID ?? 'gofunio',
  secretAccessKey:
    process.env.ATTACHMENT_STORAGE_SECRET_ACCESS_KEY ?? 'gofunio-local-storage',
  forcePathStyle: true,
  pageSize: 1,
});

describe('S3AttachmentObjectStore MinIO contract', () => {
  afterAll(async () => {
    await Promise.allSettled([store.delete(firstKey), store.delete(secondKey)]);
  });

  it('puts, verifies and presigns, paginates, and deletes idempotently', async () => {
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

    const downloadUrl = await store.createDownloadUrl({
      key: firstKey,
      fileName: 'contract.pdf',
      expiresInSeconds: 300,
    });
    const response = await fetch(downloadUrl);
    expect(response.status).toBe(200);
    expect(await response.text()).toBe('first');
    expect(response.headers.get('content-disposition')).toContain('attachment');

    const firstPage = await store.list({ prefix });
    expect(firstPage.objects.map(({ key }) => key)).toEqual([firstKey]);
    expect(firstPage.nextCursor).toBeDefined();
    const secondPage = await store.list({
      prefix,
      cursor: firstPage.nextCursor,
    });
    expect(secondPage.objects.map(({ key }) => key)).toEqual([secondKey]);
    expect(secondPage.nextCursor).toBeUndefined();

    await store.delete(firstKey);
    await store.delete(firstKey);
    await expect(
      store.createDownloadUrl({
        key: firstKey,
        fileName: 'contract.pdf',
        expiresInSeconds: 300,
      }),
    ).rejects.toBeInstanceOf(AttachmentStorageInconsistentError);
  });
});
