import { Logger, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AttachmentStorageDriver, EnvVars } from '../config/env.validation';
import {
  ATTACHMENT_OBJECT_STORE,
  AttachmentObjectStore,
} from './attachment-object-store';
import { InMemoryAttachmentObjectStore } from './in-memory-attachment-object-store';
import {
  attachmentStorageStatus,
  S3AttachmentObjectStore,
  S3AttachmentObjectStoreConfig,
} from './s3-attachment-object-store';

interface WarningLogger {
  warn(message: string): void;
}

type AttachmentStorageConfig =
  | { driver: AttachmentStorageDriver.Memory }
  | ({ driver: AttachmentStorageDriver.S3 } & S3AttachmentObjectStoreConfig);

interface ProviderError {
  name?: string;
}

export class AttachmentStorageConfigurationError extends Error {
  constructor() {
    super('Attachment storage bucket or credentials are invalid');
    this.name = AttachmentStorageConfigurationError.name;
  }
}

export async function createAttachmentObjectStore(
  config: AttachmentStorageConfig,
  logger: WarningLogger,
  createS3: (
    config: S3AttachmentObjectStoreConfig,
  ) => AttachmentObjectStore & { probeBucket(): Promise<void> } = (s3Config) =>
    new S3AttachmentObjectStore(s3Config),
): Promise<AttachmentObjectStore> {
  if (config.driver === AttachmentStorageDriver.Memory) {
    return new InMemoryAttachmentObjectStore();
  }

  const store = createS3(config);
  try {
    await store.probeBucket();
  } catch (error) {
    if (isDefinitiveStartupFailure(error)) {
      throw new AttachmentStorageConfigurationError();
    }
    logger.warn(
      'Attachment storage startup probe failed transiently; storage is degraded',
    );
  }
  return store;
}

const logger = new Logger('AttachmentStorageModule');

@Module({
  providers: [
    {
      provide: ATTACHMENT_OBJECT_STORE,
      inject: [ConfigService],
      useFactory: (config: ConfigService<EnvVars, true>) =>
        createAttachmentObjectStore(storageConfig(config), logger),
    },
  ],
  exports: [ATTACHMENT_OBJECT_STORE],
})
export class AttachmentStorageModule {}

function storageConfig(
  config: ConfigService<EnvVars, true>,
): AttachmentStorageConfig {
  const driver = config.getOrThrow<AttachmentStorageDriver>(
    'ATTACHMENT_STORAGE_DRIVER',
  );
  if (driver === AttachmentStorageDriver.Memory) return { driver };

  return {
    driver,
    endpoint: config.getOrThrow<string>('ATTACHMENT_STORAGE_ENDPOINT'),
    publicEndpoint: config.getOrThrow<string>(
      'ATTACHMENT_STORAGE_PUBLIC_ENDPOINT',
    ),
    region: config.getOrThrow<string>('ATTACHMENT_STORAGE_REGION'),
    bucket: config.getOrThrow<string>('ATTACHMENT_STORAGE_BUCKET'),
    accessKeyId: config.getOrThrow<string>('ATTACHMENT_STORAGE_ACCESS_KEY_ID'),
    secretAccessKey: config.getOrThrow<string>(
      'ATTACHMENT_STORAGE_SECRET_ACCESS_KEY',
    ),
    forcePathStyle:
      config.getOrThrow<string>('ATTACHMENT_STORAGE_FORCE_PATH_STYLE') ===
      'true',
  };
}

function isDefinitiveStartupFailure(error: unknown): boolean {
  const status = attachmentStorageStatus(error);
  const name = (error as ProviderError)?.name;
  return (
    status === 401 ||
    status === 403 ||
    status === 404 ||
    name === 'AccessDenied' ||
    name === 'NoSuchBucket'
  );
}
