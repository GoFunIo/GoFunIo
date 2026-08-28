import { INestApplication } from '@nestjs/common';
import { DataSource } from 'typeorm';
import request from 'supertest';
import { App } from 'supertest/types';
import { ResendHttpError } from '../src/mail/resend.client';
import { NotificationDeliveryWorker } from '../src/notifications/notification-delivery-worker';
import {
  NotificationEmailSendInput,
  NotificationEmailSender,
} from '../src/notifications/notification-email-sender';
import { MembershipRole } from '../src/users/membership-role';
import {
  captureEmittedEvents,
  createVerifiedUser,
} from './helpers/auth-test-utils';
import { createTestApp } from './helpers/create-test-app';

class FakeNotificationEmailSender implements NotificationEmailSender {
  readonly calls: NotificationEmailSendInput[] = [];
  readonly outcomes: Array<Error | string> = [];

  async send(input: NotificationEmailSendInput) {
    this.calls.push(input);
    const outcome = this.outcomes.shift() ?? `message-${this.calls.length}`;
    if (outcome instanceof Error) throw outcome;
    return { providerMessageId: outcome };
  }

  reset(): void {
    this.calls.length = 0;
    this.outcomes.length = 0;
  }
}

describe('Notification Delivery worker (authenticated PostgreSQL e2e)', () => {
  let app: INestApplication<App>;
  let dataSource: DataSource;
  let worker: NotificationDeliveryWorker;
  let instant = new Date('2026-08-28T10:00:00.000Z');
  const sender = new FakeNotificationEmailSender();

  beforeAll(async () => {
    app = (await createTestApp({
      clock: { now: () => new Date(instant) },
      notificationEmailSender: sender,
    })) as INestApplication<App>;
    dataSource = app.get(DataSource);
    worker = app.get(NotificationDeliveryWorker);
  });

  beforeEach(() => {
    instant = new Date('2026-08-28T10:00:00.000Z');
    sender.reset();
  });

  afterAll(() => app.close());

  async function owner(email: string) {
    await createVerifiedUser(app, email, 'Password123!');
    const agent = request.agent(app.getHttpServer());
    await agent
      .post('/auth/signin')
      .send({ email, password: 'Password123!' })
      .expect(201);
    return agent;
  }

  async function vehicle(
    actor: ReturnType<typeof request.agent>,
    suffix: string,
  ) {
    return actor
      .post('/vehicles')
      .send({
        brand: 'Toyota',
        model: 'Corolla',
        registrationNumber: `EML${suffix}`,
        ocExpiry: '2026-09-11',
      })
      .expect(201);
  }

  async function deliveryForEmail(email: string) {
    const [delivery] = await dataSource.query<
      Array<{
        id: string;
        companyId: string;
        status: string;
        attempts: number;
        recipientAddress: string | null;
        providerMessageId: string | null;
        lastError: string | null;
      }>
    >(
      `SELECT delivery.id, delivery."companyId", delivery.status, delivery.attempts,
              delivery."recipientAddress", delivery."providerMessageId", delivery."lastError"
         FROM notification_deliveries delivery
         JOIN notification_recipients recipient ON recipient.id = delivery."recipientId"
         JOIN memberships membership ON membership.id = recipient."membershipId"
         JOIN users app_user ON app_user.id = membership."userId"
        WHERE app_user.email = $1 OR delivery."recipientAddress" = $1
        ORDER BY delivery."createdAt" DESC LIMIT 1`,
      [email],
    );
    return delivery;
  }

  async function inviteManager(
    actor: ReturnType<typeof request.agent>,
    email: string,
  ) {
    const events = captureEmittedEvents(app);
    try {
      const response = await actor
        .post('/users')
        .send({ email, role: MembershipRole.MANAGER })
        .expect(201);
      await request(app.getHttpServer())
        .post('/auth/reset-password')
        .send({
          token: events.passwordResetToken,
          password: 'Invited-password1!',
        })
        .expect(204);
      return response.body.id as string;
    } finally {
      events.restore();
    }
  }

  it('captures the currently verified address on first attempt and marks acceptance as SENT', async () => {
    const actor = await owner('capture-original@example.com');
    await vehicle(actor, 'CAP001');
    await dataSource.query(
      `UPDATE users SET email = 'capture-current@example.com', "emailVerifiedAt" = $1
        WHERE email = 'capture-original@example.com'`,
      [instant],
    );

    await worker.processDue(instant);

    expect(sender.calls).toHaveLength(1);
    expect(sender.calls[0]).toMatchObject({
      to: 'capture-current@example.com',
      idempotencyKey: expect.any(String),
      subject: 'Termin OC pojazdu EMLCAP001',
    });
    const stored = await deliveryForEmail('capture-current@example.com');
    expect(stored).toMatchObject({
      status: 'SENT',
      attempts: 1,
      recipientAddress: 'capture-current@example.com',
      providerMessageId: 'message-1',
      lastError: null,
    });
    expect(sender.calls[0].idempotencyKey).toBe(stored.id);
  });

  it('retries with the captured address and the same idempotency key after a profile change', async () => {
    const actor = await owner('retry-original@example.com');
    await vehicle(actor, 'RTY001');
    sender.outcomes.push(new ResendHttpError(503), 'retry-accepted');

    await worker.processDue(instant);
    const afterFailure = await deliveryForEmail('retry-original@example.com');
    expect(afterFailure).toMatchObject({
      status: 'PENDING',
      attempts: 1,
      recipientAddress: 'retry-original@example.com',
      lastError: 'provider_http_503',
    });
    await dataSource.query(
      `UPDATE users SET email = 'retry-changed@example.com', "emailVerifiedAt" = $1
        WHERE email = 'retry-original@example.com'`,
      [instant],
    );
    instant = new Date('2026-08-28T10:01:00.000Z');

    await worker.processDue(instant);

    expect(sender.calls.map(({ to }) => to)).toEqual([
      'retry-original@example.com',
      'retry-original@example.com',
    ]);
    expect(
      new Set(sender.calls.map(({ idempotencyKey }) => idempotencyKey)).size,
    ).toBe(1);
    const stored = await deliveryForEmail('retry-original@example.com');
    expect(stored).toMatchObject({
      status: 'SENT',
      attempts: 2,
      recipientAddress: 'retry-original@example.com',
      providerMessageId: 'retry-accepted',
    });
  });

  it('marks permanent provider rejection as FAILED with bounded diagnostics', async () => {
    const actor = await owner('failed-delivery@example.com');
    await vehicle(actor, 'FLD001');
    sender.outcomes.push(new ResendHttpError(422));

    await worker.processDue(instant);

    expect(await deliveryForEmail('failed-delivery@example.com')).toMatchObject(
      {
        status: 'FAILED',
        attempts: 1,
        recipientAddress: 'failed-delivery@example.com',
        providerMessageId: null,
        lastError: 'provider_http_422',
      },
    );
  });

  it('cancels after preference changes or verified-address loss without calling the provider', async () => {
    const preferenceActor = await owner('preference-cancel@example.com');
    await vehicle(preferenceActor, 'PRF001');
    await preferenceActor
      .patch('/notification-preferences/me')
      .send({
        preferences: [{ category: 'FLEET_DEADLINES', emailMode: 'OFF' }],
      })
      .expect(200);
    const addressActor = await owner('address-cancel@example.com');
    await vehicle(addressActor, 'ADR001');
    await dataSource.query(
      `UPDATE users SET "emailVerifiedAt" = NULL WHERE email = 'address-cancel@example.com'`,
    );

    await worker.processDue(instant);

    expect(sender.calls).toEqual([]);
    expect(
      await deliveryForEmail('preference-cancel@example.com'),
    ).toMatchObject({
      status: 'CANCELLED',
      lastError: 'preference_disabled',
    });
    expect(await deliveryForEmail('address-cancel@example.com')).toMatchObject({
      status: 'CANCELLED',
      lastError: 'no_verified_address',
    });
  });

  it('cancels after Membership or Vehicle Access loss without calling the provider', async () => {
    const inactiveActor = await owner('membership-cancel@example.com');
    await vehicle(inactiveActor, 'MEM001');
    await dataSource.query(
      `UPDATE memberships SET status = 'removed'
        WHERE "userId" = (SELECT id FROM users WHERE email = 'membership-cancel@example.com')`,
    );

    const workspaceOwner = await owner('access-owner@example.com');
    await workspaceOwner
      .patch('/notification-preferences/me')
      .send({
        preferences: [{ category: 'FLEET_DEADLINES', emailMode: 'OFF' }],
      })
      .expect(200);
    const managerId = await inviteManager(
      workspaceOwner,
      'access-manager@example.com',
    );
    const created = await vehicle(workspaceOwner, 'ACC001');
    await workspaceOwner
      .post(`/vehicles/${created.body.id}/managers`)
      .send({ managerId })
      .expect(201);
    await dataSource.query(
      `UPDATE manager_vehicle_assignments SET "assignedTo" = $1
        WHERE "managerId" = $2 AND "vehicleId" = $3 AND "assignedTo" IS NULL`,
      [new Date(), managerId, created.body.id],
    );

    await worker.processDue(instant);

    expect(sender.calls).toEqual([]);
    expect(
      await deliveryForEmail('membership-cancel@example.com'),
    ).toMatchObject({
      status: 'CANCELLED',
      lastError: 'membership_inactive',
    });
    expect(await deliveryForEmail('access-manager@example.com')).toMatchObject({
      status: 'CANCELLED',
      lastError: 'source_unauthorized',
    });
  });

  it('cancels invalid, source-stale, and revoked Notifications without calling the provider', async () => {
    const invalidActor = await owner('invalid-cancel@example.com');
    await vehicle(invalidActor, 'INV001');
    await dataSource.query(
      `UPDATE notifications SET "invalidatedAt" = $1
        WHERE id = (SELECT "notificationId" FROM notification_recipients recipient
          JOIN memberships membership ON membership.id = recipient."membershipId"
          JOIN users app_user ON app_user.id = membership."userId"
          WHERE app_user.email = 'invalid-cancel@example.com')`,
      [instant],
    );
    const revokedActor = await owner('revoked-cancel@example.com');
    await vehicle(revokedActor, 'RVK001');
    await dataSource.query(
      `UPDATE notification_recipients SET "revokedAt" = $1
        WHERE "membershipId" = (SELECT membership.id FROM memberships membership
          JOIN users app_user ON app_user.id = membership."userId"
          WHERE app_user.email = 'revoked-cancel@example.com')`,
      [instant],
    );
    const sourceActor = await owner('source-cancel@example.com');
    const sourceVehicle = await vehicle(sourceActor, 'SRC001');
    await dataSource.query(
      `UPDATE vehicles SET "ocExpiry" = '2026-10-01' WHERE id = $1`,
      [sourceVehicle.body.id],
    );

    await worker.processDue(instant);

    expect(sender.calls).toEqual([]);
    expect(await deliveryForEmail('invalid-cancel@example.com')).toMatchObject({
      status: 'CANCELLED',
      lastError: 'notification_invalid',
    });
    expect(await deliveryForEmail('revoked-cancel@example.com')).toMatchObject({
      status: 'CANCELLED',
      lastError: 'source_unauthorized',
    });
    expect(await deliveryForEmail('source-cancel@example.com')).toMatchObject({
      status: 'CANCELLED',
      lastError: 'notification_invalid',
    });
  });

  it('keeps recipient addresses and deep links isolated between Workspaces', async () => {
    const first = await owner('workspace-one@example.com');
    await vehicle(first, 'WSP001');
    const second = await owner('workspace-two@example.com');
    await vehicle(second, 'WSP002');

    await worker.processDue(instant);

    expect(sender.calls).toHaveLength(2);
    const rows = await dataSource.query<
      Array<{ id: string; companyId: string; recipientAddress: string }>
    >(
      `SELECT id, "companyId", "recipientAddress"
         FROM notification_deliveries ORDER BY "recipientAddress"`,
    );
    for (const row of rows) {
      const call = sender.calls.find(
        ({ idempotencyKey }) => idempotencyKey === row.id,
      );
      expect(call?.to).toBe(row.recipientAddress);
      expect(call?.html).toContain(`workspaceId=${row.companyId}`);
      const other = rows.find(({ id }) => id !== row.id)!;
      expect(call?.html).not.toContain(other.companyId);
    }
  });
});
