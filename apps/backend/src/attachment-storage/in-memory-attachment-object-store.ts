import {
  AttachmentObjectStore,
  AttachmentStorageInconsistentError,
  AttachmentStorageUnavailableError,
} from './attachment-object-store';

type Operation = 'put' | 'head' | 'delete' | 'list';

interface StoredObject {
  body: Buffer;
  lastModified: Date;
}

export class InMemoryAttachmentObjectStore implements AttachmentObjectStore {
  private readonly objects = new Map<string, StoredObject>();
  private readonly failures = new Map<Operation, Error>();
  private readonly pageSize: number;

  constructor(options: { pageSize?: number } = {}) {
    this.pageSize = options.pageSize ?? 1000;
  }

  failNext(
    operation: Operation,
    error: Error = new AttachmentStorageUnavailableError(),
  ): void {
    this.failures.set(operation, error);
  }

  async put(input: {
    key: string;
    body: Buffer;
    mimeType: string;
  }): Promise<void> {
    this.throwInjectedFailure('put');
    this.objects.set(input.key, {
      body: Buffer.from(input.body),
      lastModified: new Date(),
    });
  }

  async createDownloadUrl(input: {
    key: string;
    fileName: string;
    expiresInSeconds: number;
  }): Promise<URL> {
    this.throwInjectedFailure('head');
    if (!this.objects.has(input.key)) {
      throw new AttachmentStorageInconsistentError();
    }

    return new URL(`memory://attachment/${encodeURIComponent(input.key)}`);
  }

  async delete(key: string): Promise<void> {
    this.throwInjectedFailure('delete');
    this.objects.delete(key);
  }

  async list(input: { prefix: string; cursor?: string }): Promise<{
    objects: Array<{ key: string; size: number; lastModified: Date }>;
    nextCursor?: string;
  }> {
    this.throwInjectedFailure('list');
    const keys = [...this.objects.keys()]
      .filter(
        (key) =>
          key.startsWith(input.prefix) && (!input.cursor || key > input.cursor),
      )
      .sort();
    const page = keys.slice(0, this.pageSize);

    return {
      objects: page.map((key) => {
        const object = this.objects.get(key)!;
        return {
          key,
          size: object.body.length,
          lastModified: new Date(object.lastModified),
        };
      }),
      nextCursor: keys.length > page.length ? page.at(-1) : undefined,
    };
  }

  private throwInjectedFailure(operation: Operation): void {
    const error = this.failures.get(operation);
    if (!error) return;
    this.failures.delete(operation);
    throw error;
  }
}
