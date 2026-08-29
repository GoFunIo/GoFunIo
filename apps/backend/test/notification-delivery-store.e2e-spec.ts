import { INestApplication } from '@nestjs/common';
import { DataSource } from 'typeorm';
import request from 'supertest';
import { App } from 'supertest/types';
import { createVerifiedUser } from './helpers/auth-test-utils';
import { createTestApp } from './helpers/create-test-app';
import { WorkspaceCalendar } from '../src/common/workspace-calendar';
import { TypeOrmVehicleAccess } from '../src/fleet/typeorm-vehicle-access';
import { TypeOrmNotificationDeliveryStore } from '../src/notifications/typeorm-notification-delivery-store';
import { VehicleDeadlineDeliveryTypeAdapter } from '../src/notifications/vehicle-deadline-delivery-type-adapter';
import { NotificationChangeRelay } from '../src/notification-changes/notification-change-relay';

describe('TypeOrmNotificationDeliveryStore (PostgreSQL integration)', () => {
  let app: INestApplication<App>;
  let primary: DataSource;
  let connectionSequence = 0;
  let vehicleSequence = 0;
  const instant = new Date('2026-08-28T10:00:00.000Z');
  const connections: DataSource[] = [];

  beforeAll(async () => {
    app = (await createTestApp({
      clock: { now: () => new Date(instant) },
    })) as INestApplication<App>;
    primary = app.get(DataSource);
  });

  afterEach(async () => {
    await Promise.all(connections.splice(0).map((item) => item.destroy()));
  });

  afterAll(() => app.close());

  async function store() {
    const dataSource = new DataSource({
      ...primary.options,
      name: `delivery-store-${++connectionSequence}`,
    });
    await dataSource.initialize();
    connections.push(dataSource);
    const calendar = new WorkspaceCalendar({ now: () => new Date(instant) });
    const vehicleAccess = new TypeOrmVehicleAccess(
      dataSource,
      new NotificationChangeRelay(dataSource),
    );
    return new TypeOrmNotificationDeliveryStore(
      dataSource,
      [new VehicleDeadlineDeliveryTypeAdapter(vehicleAccess, calendar)],
      {
        corsOrigins: ['https://app.gofun.io'],
        allowsMutation: () => true,
        resolveLinkBase: () => 'https://app.gofun.io',
      },
    );
  }

  async function pendingDelivery(email: string): Promise<string> {
    await createVerifiedUser(app, email, 'Password123!');
    const actor = request.agent(app.getHttpServer());
    await actor
      .post('/auth/signin')
      .send({ email, password: 'Password123!' })
      .expect(201);
    await actor
      .post('/vehicles')
      .send({
        brand: 'Toyota',
        model: 'Corolla',
        registrationNumber: `DLV${String(++vehicleSequence).padStart(6, '0')}`,
        ocExpiry: '2026-09-11',
      })
      .expect(201);
    const [row] = await primary.query<Array<{ id: string }>>(
      `SELECT id FROM notification_deliveries`,
    );
    return row.id;
  }

  it('allows concurrent connections to claim each due Delivery only once', async () => {
    const deliveryId = await pendingDelivery('claim-once@example.com');
    const first = await store();
    const second = await store();

    const claims = (
      await Promise.all([
        first.claim(instant, 25, 5 * 60 * 1000),
        second.claim(instant, 25, 5 * 60 * 1000),
      ])
    ).flat();

    expect(claims.map(({ id }) => id)).toEqual([deliveryId]);
  });

  it('skips a row locked by another connection instead of waiting', async () => {
    const deliveryId = await pendingDelivery('skip-locked@example.com');
    const locker = new DataSource({
      ...primary.options,
      name: `delivery-locker-${++connectionSequence}`,
    });
    await locker.initialize();
    connections.push(locker);
    const queryRunner = locker.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    await queryRunner.query(
      `SELECT id FROM notification_deliveries WHERE id = $1 FOR UPDATE`,
      [deliveryId],
    );
    const claimant = await store();

    await expect(claimant.claim(instant, 25, 5 * 60 * 1000)).resolves.toEqual(
      [],
    );

    await queryRunner.rollbackTransaction();
    await queryRunner.release();
  });

  it('recovers an expired lease and rejects completion by its old owner', async () => {
    const deliveryId = await pendingDelivery('lease-recovery@example.com');
    const firstStore = await store();
    const secondStore = await store();
    const [first] = await firstStore.claim(instant, 1, 5 * 60 * 1000);
    const reclaimedAt = new Date('2026-08-28T10:06:00.000Z');
    const [second] = await secondStore.claim(reclaimedAt, 1, 5 * 60 * 1000);

    expect(second).toMatchObject({
      id: deliveryId,
      recoveredLease: true,
      claimedAt: reclaimedAt,
    });
    await expect(
      firstStore.completeSent({
        id: deliveryId,
        claimedAt: first.claimedAt,
        attempts: 1,
        providerMessageId: 'stale-message',
        sentAt: reclaimedAt,
      }),
    ).resolves.toBe(false);
    await expect(
      secondStore.completeSent({
        id: deliveryId,
        claimedAt: second.claimedAt,
        attempts: 1,
        providerMessageId: 'accepted-message',
        sentAt: reclaimedAt,
      }),
    ).resolves.toBe(true);
    const [stored] = await primary.query<
      Array<{ status: string; providerMessageId: string }>
    >(
      `SELECT status, "providerMessageId" FROM notification_deliveries WHERE id = $1`,
      [deliveryId],
    );
    expect(stored).toEqual({
      status: 'SENT',
      providerMessageId: 'accepted-message',
    });
  });
});
