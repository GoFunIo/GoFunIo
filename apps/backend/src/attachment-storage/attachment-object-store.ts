export const ATTACHMENT_OBJECT_STORE = Symbol('ATTACHMENT_OBJECT_STORE');

export interface AttachmentObjectStore {
  put(input: { key: string; body: Buffer; mimeType: string }): Promise<void>;
  createDownloadUrl(input: {
    key: string;
    fileName: string;
    expiresInSeconds: number;
  }): Promise<URL>;
  delete(key: string): Promise<void>;
  list(input: { prefix: string; cursor?: string }): Promise<{
    objects: Array<{ key: string; size: number; lastModified: Date }>;
    nextCursor?: string;
  }>;
}

export class AttachmentStorageUnavailableError extends Error {
  readonly code = 'ATTACHMENT_STORAGE_UNAVAILABLE';

  constructor(readonly cause?: unknown) {
    super('Attachment storage is unavailable');
    this.name = AttachmentStorageUnavailableError.name;
  }
}

export class AttachmentStorageInconsistentError extends Error {
  readonly code = 'ATTACHMENT_STORAGE_INCONSISTENT';

  constructor(readonly cause?: unknown) {
    super('Attachment storage object is missing');
    this.name = AttachmentStorageInconsistentError.name;
  }
}
