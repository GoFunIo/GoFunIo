import { Logger, type INestApplication } from '@nestjs/common';
import { DataSource, QueryRunner } from 'typeorm';
import { createTestApp } from './helpers/create-test-app';
import { NotificationChangeRelay } from '../src/notification-changes/notification-change-relay';
import { Company } from '../src/companies/companies.entity';
import { User } from '../src/users/users.entity';
import { Membership } from '../src/users/membership.entity';
import { MembershipRole } from '../src/users/membership-role';

describe('Notification change relay (PostgreSQL)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let listener: QueryRunner;
  let relay: NotificationChangeRelay;
  let companyId: string;
  let userId: string;

  beforeEach(async () => {
    app = await createTestApp();
    dataSource = app.get(DataSource);
    relay = app.get(NotificationChangeRelay);
    listener = dataSource.createQueryRunner();
    await listener.connect();
    await listener.query('LISTEN notification_changes');
    const company = await dataSource.getRepository(Company).save({
      name: 'Relay workspace',
    });
    const user = await dataSource.getRepository(User).save({
      email: `relay-${Date.now()}@example.com`,
    });
    await dataSource.getRepository(Membership).save({
      companyId: company.id,
      userId: user.id,
      role: MembershipRole.OWNER,
      status: 'active',
    });
    companyId = company.id;
    userId = user.id;
  });

  afterEach(async () => {
    await listener.release();
    await app.close();
  });

  it('publishes only the relay UUID after commit and resolves its scope', async () => {
    const log = jest.spyOn(Logger.prototype, 'log').mockImplementation();
    const notification = nextNotification(listener);
    const transaction = dataSource.createQueryRunner();
    await transaction.connect();
    await transaction.startTransaction();
    const id = await relay.record(transaction.manager, { companyId, userId });

    expect(
      await dataSource.query(
        'SELECT count(*)::int AS count FROM notification_changes WHERE id = $1',
        [id],
      ),
    ).toEqual([{ count: 0 }]);
    await expect(noNotificationYet(notification)).resolves.toBeUndefined();

    await transaction.commitTransaction();
    const received = await notification;
    expect(received).toMatchObject({
      channel: 'notification_changes',
      payload: id,
    });
    expect(received.payload).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );
    await expect(relay.find(id)).resolves.toMatchObject({
      id,
      companyId,
      userId,
    });
    expect(log).toHaveBeenCalledWith(
      JSON.stringify({
        event: 'notification_invalidation_enqueued',
        changeId: id,
        audience: 'USER',
      }),
    );
    expect(JSON.stringify(log.mock.calls)).not.toContain(companyId);
    expect(JSON.stringify(log.mock.calls)).not.toContain(userId);
    log.mockRestore();
    await transaction.release();
  });

  it('does not publish or retain a rolled-back change', async () => {
    const log = jest.spyOn(Logger.prototype, 'log').mockImplementation();
    const notification = nextNotification(listener);
    const transaction = dataSource.createQueryRunner();
    await transaction.connect();
    await transaction.startTransaction();
    const id = await relay.record(transaction.manager, {
      companyId,
      userId,
    });

    await transaction.rollbackTransaction();

    await expect(noNotificationYet(notification)).resolves.toBeUndefined();
    await expect(relay.find(id)).resolves.toBeNull();
    expect(
      log.mock.calls.some(([entry]) =>
        String(entry).includes('notification_invalidation_enqueued'),
      ),
    ).toBe(false);
    log.mockRestore();
    await transaction.release();
  });

  it('purges only relay rows older than the short retention cutoff', async () => {
    const oldId = await dataSource.transaction((manager) =>
      relay.record(manager, {
        companyId,
        userId: null,
      }),
    );
    const freshId = await dataSource.transaction((manager) =>
      relay.record(manager, {
        companyId,
        userId: null,
      }),
    );
    await dataSource.query(
      `UPDATE notification_changes SET "createdAt" = $2 WHERE id = $1`,
      [oldId, new Date('2026-08-28T08:00:00.000Z')],
    );

    await relay.purgeExpired(new Date('2026-08-28T09:00:00.000Z'));

    await expect(relay.find(oldId)).resolves.toBeNull();
    await expect(relay.find(freshId)).resolves.not.toBeNull();
  });

  it('rejects a relay scope for a missing Workspace', async () => {
    await expect(
      dataSource.transaction((manager) =>
        relay.record(manager, {
          companyId: '22222222-2222-4222-8222-222222222222',
          userId: null,
        }),
      ),
    ).rejects.toMatchObject({ constraint: 'FK_notification_changes_company' });
  });

  it('rejects a User scope whose Membership belongs to another Workspace', async () => {
    const otherCompany = await dataSource.getRepository(Company).save({
      name: 'Other relay workspace',
    });

    await expect(
      dataSource.transaction((manager) =>
        relay.record(manager, {
          companyId: otherCompany.id,
          userId,
        }),
      ),
    ).rejects.toMatchObject({
      constraint: 'FK_notification_changes_membership',
    });
  });
});

interface PgNotification {
  channel: string;
  payload?: string;
}

function nextNotification(runner: QueryRunner): Promise<PgNotification> {
  const connection = (
    runner as QueryRunner & {
      databaseConnection: {
        once(
          event: 'notification',
          listener: (value: PgNotification) => void,
        ): void;
      };
    }
  ).databaseConnection;
  return new Promise((resolve) => connection.once('notification', resolve));
}

async function noNotificationYet(
  notification: Promise<PgNotification>,
): Promise<void> {
  const result = await Promise.race([
    notification.then(() => 'notification'),
    new Promise<'timeout'>((resolve) =>
      setTimeout(() => resolve('timeout'), 30),
    ),
  ]);
  expect(result).toBe('timeout');
}
