import { AttachmentStorageDriver } from '../config/env.validation';
import { InMemoryAttachmentObjectStore } from './in-memory-attachment-object-store';
import {
  AttachmentStorageConfigurationError,
  createAttachmentObjectStore,
} from './attachment-storage.module';

const s3Config = {
  driver: AttachmentStorageDriver.S3,
  endpoint: 'http://minio:9000',
  publicEndpoint: 'http://localhost:9000',
  region: 'us-east-1',
  bucket: 'attachments',
  accessKeyId: 'access',
  secretAccessKey: 'secret',
  forcePathStyle: true,
} as const;

describe('createAttachmentObjectStore', () => {
  it('uses memory without probing a provider', async () => {
    const createS3 = jest.fn();

    const store = await createAttachmentObjectStore(
      { driver: AttachmentStorageDriver.Memory },
      { warn: jest.fn() },
      createS3,
    );

    expect(store).toBeInstanceOf(InMemoryAttachmentObjectStore);
    expect(createS3).not.toHaveBeenCalled();
  });

  it.each([401, 403, 404])(
    'fails startup for definitive provider status %i without leaking details',
    async (status) => {
      const providerError = Object.assign(new Error('secret provider detail'), {
        $metadata: { httpStatusCode: status },
      });
      const store = {
        probeBucket: jest.fn().mockRejectedValue(providerError),
        put: jest.fn(),
        createReadUrl: jest.fn(),
        delete: jest.fn(),
        list: jest.fn(),
      };

      const result = createAttachmentObjectStore(
        s3Config,
        { warn: jest.fn() },
        () => store,
      );

      await expect(result).rejects.toBeInstanceOf(
        AttachmentStorageConfigurationError,
      );
      await expect(result).rejects.not.toThrow('secret provider detail');
    },
  );

  it('starts in degraded mode after a transient provider failure', async () => {
    const warn = jest.fn();
    const store = {
      probeBucket: jest.fn().mockRejectedValue(
        Object.assign(new Error('provider detail'), {
          $metadata: { httpStatusCode: 503 },
        }),
      ),
      put: jest.fn(),
      createReadUrl: jest.fn(),
      delete: jest.fn(),
      list: jest.fn(),
    };

    await expect(
      createAttachmentObjectStore(s3Config, { warn }, () => store),
    ).resolves.toBe(store);
    expect(warn).toHaveBeenCalledWith(
      'Attachment storage startup probe failed transiently; storage is degraded',
    );
  });
});
