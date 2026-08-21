import './helpers/test-env';
import { DataSource } from 'typeorm';
import { AttachmentObjectCleanup } from '../src/service-attachments/attachment-object-cleanup.entity';
import { TypeOrmAttachmentCleanupStore } from '../src/service-attachments/attachment-cleanup-worker';

describe('TypeOrmAttachmentCleanupStore (integration)', () => {
  let dataSource: DataSource;
  let store: TypeOrmAttachmentCleanupStore;
  const now = new Date('2026-08-20T12:00:00.000Z');

  beforeAll(async () => {
    dataSource = new DataSource({
      type: 'postgres',
      url: process.env.DATABASE_URL,
      schema: process.env.DATABASE_SCHEMA,
      entities: [AttachmentObjectCleanup],
      synchronize: false,
      extra: {
        options: `-c search_path=${process.env.DATABASE_SCHEMA},public`,
      },
    });
    await dataSource.initialize();
    store = new TypeOrmAttachmentCleanupStore(dataSource);
  });

  afterAll(async () => dataSource?.destroy());

  it('does not double-claim jobs and recovers an expired lease', async () => {
    const repository = dataSource.getRepository(AttachmentObjectCleanup);
    await repository.save([
      repository.create({
        objectKey: 'unlocked',
        deleteAfter: new Date('2026-08-20T11:00:00.000Z'),
        nextAttemptAt: new Date('2026-08-20T11:00:00.000Z'),
      }),
      repository.create({
        objectKey: 'expired',
        deleteAfter: new Date('2026-08-20T11:00:00.000Z'),
        nextAttemptAt: new Date('2026-08-20T11:00:00.000Z'),
        lockedAt: new Date('2026-08-20T11:54:59.000Z'),
      }),
      repository.create({
        objectKey: 'leased',
        deleteAfter: new Date('2026-08-20T11:00:00.000Z'),
        nextAttemptAt: new Date('2026-08-20T11:00:00.000Z'),
        lockedAt: new Date('2026-08-20T11:59:00.000Z'),
      }),
    ]);

    const claims = (
      await Promise.all([
        store.claim(now, 25, 5 * 60 * 1000),
        store.claim(now, 25, 5 * 60 * 1000),
      ])
    ).flat();

    expect(claims.map(({ objectKey }) => objectKey).sort()).toEqual([
      'expired',
      'unlocked',
    ]);
    expect(new Set(claims.map(({ id }) => id)).size).toBe(claims.length);
    const leased = await repository.findOneByOrFail({ objectKey: 'leased' });
    expect(leased.lockedAt).toEqual(new Date('2026-08-20T11:59:00.000Z'));
  });

  it('rejects completion and retry from a stale lease owner', async () => {
    const repository = dataSource.getRepository(AttachmentObjectCleanup);
    await repository.save(
      repository.create({
        objectKey: 'reclaimed',
        deleteAfter: new Date('2026-08-20T11:00:00.000Z'),
        nextAttemptAt: new Date('2026-08-20T11:00:00.000Z'),
      }),
    );
    const [first] = await store.claim(now, 1, 5 * 60 * 1000);
    const reclaimedAt = new Date('2026-08-20T12:06:00.000Z');
    const [second] = await store.claim(reclaimedAt, 1, 5 * 60 * 1000);

    await expect(
      store.complete(first.id, first.claimedAt, reclaimedAt),
    ).resolves.toBe(false);
    await expect(
      store.retry({
        id: first.id,
        claimedAt: first.claimedAt,
        attempts: 1,
        nextAttemptAt: reclaimedAt,
        lastError: 'stale',
      }),
    ).resolves.toBe(false);
    await expect(
      store.complete(second.id, second.claimedAt, reclaimedAt),
    ).resolves.toBe(true);
  });
});
