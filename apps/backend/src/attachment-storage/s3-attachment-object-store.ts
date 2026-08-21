import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadBucketCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import {
  AttachmentObjectStore,
  AttachmentStorageInconsistentError,
  AttachmentStorageUnavailableError,
} from './attachment-object-store';

export interface S3AttachmentObjectStoreConfig {
  endpoint: string;
  publicEndpoint: string;
  region: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
  forcePathStyle: boolean;
  pageSize?: number;
}

interface CommandClient {
  send(command: unknown): Promise<unknown>;
}

interface Dependencies {
  storageClient: CommandClient;
  signingClient: unknown;
  presign(
    client: unknown,
    command: GetObjectCommand,
    options: { expiresIn: number },
  ): Promise<string>;
}

interface ProviderError {
  name?: string;
  $metadata?: { httpStatusCode?: number };
}

export class S3AttachmentObjectStore implements AttachmentObjectStore {
  private readonly storageClient: CommandClient;
  private readonly signingClient: unknown;
  private readonly presign: Dependencies['presign'];

  constructor(
    private readonly config: S3AttachmentObjectStoreConfig,
    dependencies?: Dependencies,
  ) {
    if (dependencies) {
      this.storageClient = dependencies.storageClient;
      this.signingClient = dependencies.signingClient;
      this.presign = (client, command, options) =>
        dependencies.presign(client, command, options);
      return;
    }

    const clientConfig = {
      region: config.region,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
      forcePathStyle: config.forcePathStyle,
    };
    this.storageClient = new S3Client({
      ...clientConfig,
      endpoint: config.endpoint,
    });
    this.signingClient = new S3Client({
      ...clientConfig,
      endpoint: config.publicEndpoint,
    });
    this.presign = (client, command, options) =>
      getSignedUrl(client as S3Client, command, options);
  }

  async probeBucket(): Promise<void> {
    await this.storageClient.send(
      new HeadBucketCommand({ Bucket: this.config.bucket }),
    );
  }

  async put(input: {
    key: string;
    body: Buffer;
    mimeType: string;
  }): Promise<void> {
    try {
      await this.storageClient.send(
        new PutObjectCommand({
          Bucket: this.config.bucket,
          Key: input.key,
          Body: input.body,
          ContentType: input.mimeType,
        }),
      );
    } catch (error) {
      throw new AttachmentStorageUnavailableError(error);
    }
  }

  async createDownloadUrl(input: {
    key: string;
    fileName: string;
    expiresInSeconds: number;
  }): Promise<URL> {
    try {
      await this.storageClient.send(
        new HeadObjectCommand({ Bucket: this.config.bucket, Key: input.key }),
      );
    } catch (error) {
      if (isMissing(error)) throw new AttachmentStorageInconsistentError(error);
      throw new AttachmentStorageUnavailableError(error);
    }

    try {
      const signed = await this.presign(
        this.signingClient,
        new GetObjectCommand({
          Bucket: this.config.bucket,
          Key: input.key,
          ResponseContentDisposition: downloadDisposition(input.fileName),
        }),
        { expiresIn: input.expiresInSeconds },
      );
      return new URL(signed);
    } catch (error) {
      throw new AttachmentStorageUnavailableError(error);
    }
  }

  async delete(key: string): Promise<void> {
    try {
      await this.storageClient.send(
        new DeleteObjectCommand({ Bucket: this.config.bucket, Key: key }),
      );
    } catch (error) {
      if (isMissing(error)) return;
      throw new AttachmentStorageUnavailableError(error);
    }
  }

  async list(input: { prefix: string; cursor?: string }): Promise<{
    objects: Array<{ key: string; size: number; lastModified: Date }>;
    nextCursor?: string;
  }> {
    try {
      const output = (await this.storageClient.send(
        new ListObjectsV2Command({
          Bucket: this.config.bucket,
          Prefix: input.prefix,
          ContinuationToken: input.cursor,
          MaxKeys: this.config.pageSize,
        }),
      )) as {
        Contents?: Array<{
          Key?: string;
          Size?: number;
          LastModified?: Date;
        }>;
        NextContinuationToken?: string;
      };

      return {
        objects: (output.Contents ?? []).flatMap((object) =>
          object.Key !== undefined &&
          object.Size !== undefined &&
          object.LastModified !== undefined
            ? [
                {
                  key: object.Key,
                  size: object.Size,
                  lastModified: object.LastModified,
                },
              ]
            : [],
        ),
        nextCursor: output.NextContinuationToken,
      };
    } catch (error) {
      throw new AttachmentStorageUnavailableError(error);
    }
  }
}

export function attachmentStorageStatus(error: unknown): number | undefined {
  return (error as ProviderError)?.$metadata?.httpStatusCode;
}

function isMissing(error: unknown): boolean {
  const providerError = error as ProviderError;
  return (
    attachmentStorageStatus(error) === 404 ||
    providerError?.name === 'NotFound' ||
    providerError?.name === 'NoSuchKey'
  );
}

function downloadDisposition(fileName: string): string {
  const encoded = encodeURIComponent(fileName).replace(
    /[!'()*]/g,
    (character) => `%${character.charCodeAt(0).toString(16).toUpperCase()}`,
  );
  return `attachment; filename="attachment"; filename*=UTF-8''${encoded}`;
}
