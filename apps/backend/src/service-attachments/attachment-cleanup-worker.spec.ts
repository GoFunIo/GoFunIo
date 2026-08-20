import { Logger } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import { AttachmentStorageUnavailableError } from '../attachment-storage/attachment-object-store';
import { InMemoryAttachmentObjectStore } from '../attachment-storage/in-memory-attachment-object-store';
import { NodeEnv, type EnvVars } from '../config/env.validation';
import {
  AttachmentCleanupWorker,
  type AttachmentCleanupJob,
  type AttachmentCleanupStore,
} from './attachment-cleanup-worker';

const now = new Date('2026-08-20T12:00:00.000Z');

class FakeCleanupStore implements AttachmentCleanupStore {
  jobs: Array<Omit<AttachmentCleanupJob, 'claimedAt' | 'recoveredLease'>> = [];
  claim = jest.fn((claimedAt: Date) =>
    Promise.resolve(
      this.jobs.splice(0).map((job) => ({
        ...job,
        claimedAt,
        recoveredLease: false,
      })),
    ),
  );
  renew = jest.fn(() => Promise.resolve(true));
  complete = jest.fn(() => Promise.resolve(true));
  retry = jest.fn(() => Promise.resolve(true));
  purgeCompleted = jest.fn(() => Promise.resolve());
}

const testConfig = {
  get: jest.fn(() => NodeEnv.Test),
} as unknown as ConfigService<EnvVars, true>;

describe('AttachmentCleanupWorker', () => {
  it('deletes claimed objects and completes their jobs', async () => {
    const store = new FakeCleanupStore();
    store.jobs.push({
      id: 'cleanup-one',
      objectKey: 'object-one',
      attempts: 0,
    });
    const objects = new InMemoryAttachmentObjectStore();
    await objects.put({
      key: 'object-one',
      body: Buffer.from('data'),
      mimeType: 'application/pdf',
    });
    const worker = new AttachmentCleanupWorker(store, objects, testConfig);

    await worker.processDue(now);

    expect(store.renew).toHaveBeenCalledWith('cleanup-one', now, now);
    expect(store.complete).toHaveBeenCalledWith('cleanup-one', now, now);
    await expect(objects.list({ prefix: '' })).resolves.toMatchObject({
      objects: [],
    });
    expect(store.purgeCompleted).toHaveBeenCalledWith(
      new Date('2026-07-21T12:00:00.000Z'),
    );
  });

  it('backs off failed jobs and logs the fifth failure', async () => {
    const store = new FakeCleanupStore();
    store.jobs.push({
      id: 'cleanup-five',
      objectKey: 'object-five',
      attempts: 4,
    });
    const objects = new InMemoryAttachmentObjectStore();
    objects.failNext('delete', new AttachmentStorageUnavailableError());
    const error = jest.spyOn(Logger.prototype, 'error').mockImplementation();
    const worker = new AttachmentCleanupWorker(store, objects, testConfig);

    await worker.processDue(now);

    expect(store.retry).toHaveBeenCalledWith({
      id: 'cleanup-five',
      claimedAt: now,
      attempts: 5,
      nextAttemptAt: new Date('2026-08-20T12:16:00.000Z'),
      lastError: 'Attachment storage is unavailable',
    });
    expect(error).toHaveBeenCalledWith(expect.stringContaining('"attempts":5'));
    error.mockRestore();
  });

  it('keeps scheduling disabled in tests', async () => {
    const store = new FakeCleanupStore();
    const worker = new AttachmentCleanupWorker(
      store,
      new InMemoryAttachmentObjectStore(),
      testConfig,
    );

    await worker.onApplicationBootstrap();

    expect(store.claim).not.toHaveBeenCalled();
  });

  it('logs scheduled cycle failures instead of rejecting startup', async () => {
    const store = new FakeCleanupStore();
    store.purgeCompleted.mockRejectedValueOnce(
      new Error('database unavailable'),
    );
    const error = jest.spyOn(Logger.prototype, 'error').mockImplementation();
    const productionConfig = {
      get: jest.fn(() => NodeEnv.Production),
    } as unknown as ConfigService<EnvVars, true>;
    const worker = new AttachmentCleanupWorker(
      store,
      new InMemoryAttachmentObjectStore(),
      productionConfig,
    );

    await expect(worker.onApplicationBootstrap()).resolves.toBeUndefined();
    expect(error).toHaveBeenCalledWith(
      expect.stringContaining('attachment_cleanup_cycle_failed'),
    );
    await worker.onApplicationShutdown();
    error.mockRestore();
  });

  it('does not overlap cleanup cycles in one process', async () => {
    let release!: () => void;
    const store = new FakeCleanupStore();
    store.claim.mockImplementation(
      () =>
        new Promise<AttachmentCleanupJob[]>(
          (resolve) => (release = () => resolve([])),
        ),
    );
    const worker = new AttachmentCleanupWorker(
      store,
      new InMemoryAttachmentObjectStore(),
      testConfig,
    );

    const first = worker.processDue(now);
    const second = worker.processDue(now);
    await Promise.resolve();
    expect(store.claim).toHaveBeenCalledTimes(1);
    release();
    await Promise.all([first, second]);
  });
});
