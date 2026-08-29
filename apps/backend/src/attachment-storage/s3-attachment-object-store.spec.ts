import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadBucketCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
} from '@aws-sdk/client-s3';
import {
  AttachmentStorageInconsistentError,
  AttachmentStorageUnavailableError,
} from './attachment-object-store';
import { S3AttachmentObjectStore } from './s3-attachment-object-store';

const config = {
  endpoint: 'http://minio:9000',
  publicEndpoint: 'http://localhost:9000',
  region: 'us-east-1',
  bucket: 'attachments',
  accessKeyId: 'access',
  secretAccessKey: 'secret',
  forcePathStyle: true,
};

describe('S3AttachmentObjectStore', () => {
  it('uses S3 commands and signs the final public endpoint after verifying existence', async () => {
    const commands: unknown[] = [];
    const storageClient = {
      send: jest.fn((command: unknown) => {
        commands.push(command);
        if (command instanceof ListObjectsV2Command) {
          return Promise.resolve({
            Contents: [
              {
                Key: 'prefix/file.pdf',
                Size: 4,
                LastModified: new Date('2026-01-01T00:00:00Z'),
              },
            ],
            NextContinuationToken: 'next-token',
          });
        }
        return Promise.resolve({});
      }),
    };
    const signingClient = { endpoint: 'public' };
    const presignedCommands: unknown[] = [];
    const presign = jest.fn(
      (_client: unknown, command: unknown, options: unknown) => {
        void options;
        presignedCommands.push(command);
        return Promise.resolve('http://localhost:9000/signed');
      },
    );
    const store = new S3AttachmentObjectStore(config, {
      storageClient,
      signingClient,
      presign,
    });

    await store.probeBucket();
    await store.put({
      key: 'prefix/file.pdf',
      body: Buffer.from('data'),
      mimeType: 'application/pdf',
    });
    const url = await store.createReadUrl({
      key: 'prefix/file.pdf',
      fileName: 'faktura ą.pdf',
      expiresInSeconds: 300,
      disposition: 'attachment',
    });
    await store.createReadUrl({
      key: 'prefix/file.pdf',
      fileName: 'faktura ą.pdf',
      expiresInSeconds: 300,
      disposition: 'inline',
    });
    const page = await store.list({ prefix: 'prefix/', cursor: 'cursor' });
    await store.delete('prefix/file.pdf');

    expect(commands.map((command) => (command as object).constructor)).toEqual([
      HeadBucketCommand,
      PutObjectCommand,
      HeadObjectCommand,
      HeadObjectCommand,
      ListObjectsV2Command,
      DeleteObjectCommand,
    ]);
    expect(url.href).toBe('http://localhost:9000/signed');
    expect(presign).toHaveBeenCalledWith(
      signingClient,
      expect.any(GetObjectCommand),
      { expiresIn: 300 },
    );
    const getCommand = presignedCommands[0] as GetObjectCommand;
    expect(getCommand.input.ResponseContentDisposition).toBe(
      'attachment; filename="attachment"; filename*=UTF-8\'\'faktura%20%C4%85.pdf',
    );
    const inlineCommand = presignedCommands[1] as GetObjectCommand;
    expect(inlineCommand.input.ResponseContentDisposition).toBe(
      'inline; filename="attachment"; filename*=UTF-8\'\'faktura%20%C4%85.pdf',
    );
    expect(page).toEqual({
      objects: [
        {
          key: 'prefix/file.pdf',
          size: 4,
          lastModified: new Date('2026-01-01T00:00:00Z'),
        },
      ],
      nextCursor: 'next-token',
    });
    const listCommand = commands[4] as ListObjectsV2Command;
    expect(listCommand.input.ContinuationToken).toBe('cursor');
  });

  it('maps missing downloads to inconsistent storage and treats missing delete as success', async () => {
    const missing = Object.assign(new Error('missing'), {
      name: 'NotFound',
      $metadata: { httpStatusCode: 404 },
    });
    const storageClient = {
      send: jest.fn((command: unknown) => {
        if (
          command instanceof HeadObjectCommand ||
          command instanceof DeleteObjectCommand
        ) {
          return Promise.reject(missing);
        }
        return Promise.resolve({});
      }),
    };
    const store = new S3AttachmentObjectStore(config, {
      storageClient,
      signingClient: {},
      presign: jest.fn(),
    });

    await expect(
      store.createReadUrl({
        key: 'missing',
        fileName: 'missing.pdf',
        expiresInSeconds: 300,
        disposition: 'attachment',
      }),
    ).rejects.toBeInstanceOf(AttachmentStorageInconsistentError);
    await expect(store.delete('missing')).resolves.toBeUndefined();
  });

  it('maps provider failures without exposing their messages', async () => {
    const storageClient = {
      send: jest.fn().mockRejectedValue(new Error('secret provider detail')),
    };
    const store = new S3AttachmentObjectStore(config, {
      storageClient,
      signingClient: {},
      presign: jest.fn(),
    });

    await expect(
      store.put({ key: 'key', body: Buffer.from('x'), mimeType: 'image/png' }),
    ).rejects.toEqual(new AttachmentStorageUnavailableError(expect.any(Error)));
  });
});
