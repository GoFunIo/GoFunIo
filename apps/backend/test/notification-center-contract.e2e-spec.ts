import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types';
import { DataSource } from 'typeorm';
import { createVerifiedUser } from './helpers/auth-test-utils';
import { createTestApp } from './helpers/create-test-app';
import { truncateTestTables } from './helpers/test-db';

describe('Notification Center cross-slice contract (e2e)', () => {
  let app: INestApplication<App>;
  const now = new Date('2026-03-30T06:00:00.000Z');

  beforeAll(async () => {
    app = (await createTestApp({
      clock: { now: () => new Date(now) },
    })) as INestApplication<App>;
  });

  afterAll(() => app.close());

  it('refetches isolated preferences, Alerts, Notifications, counts, details, and Deliveries after Active Workspace switches', async () => {
    const email = 'notification-center-switch@example.com';
    await createVerifiedUser(app, email, 'Password123!');
    const actor = request.agent(app.getHttpServer());
    const signedIn = await actor
      .post('/auth/signin')
      .send({ email, password: 'Password123!' })
      .expect(201);
    const firstWorkspaceId = signedIn.body.companyId as string;

    await actor
      .patch('/notification-preferences/me')
      .send({
        preferences: [
          {
            category: 'FLEET_DEADLINES',
            emailMode: 'OFF',
            showLiveToasts: false,
          },
        ],
      })
      .expect(200);
    await actor
      .post('/vehicles')
      .send({
        brand: 'First',
        model: 'Workspace',
        registrationNumber: 'FIRST01',
        ocExpiry: '2026-04-13',
      })
      .expect(201);
    const firstNotification = (await actor.get('/notifications').expect(200))
      .body.items[0];

    const secondWorkspace = await actor
      .post('/companies')
      .send({ name: 'Second notification workspace' })
      .expect(201);
    const secondWorkspaceId = secondWorkspace.body.id as string;
    await actor
      .patch('/notification-preferences/me')
      .send({
        preferences: [
          {
            category: 'FLEET_DEADLINES',
            emailMode: 'IMMEDIATE',
            showLiveToasts: true,
          },
        ],
      })
      .expect(200);
    await actor
      .post('/vehicles')
      .send({
        brand: 'Second',
        model: 'Workspace',
        registrationNumber: 'SECOND1',
        ocExpiry: '2026-04-13',
      })
      .expect(201);
    const secondNotification = (await actor.get('/notifications').expect(200))
      .body.items[0];

    await expectWorkspaceState(actor, {
      registrationNumber: 'SECOND1',
      emailMode: 'IMMEDIATE',
      showLiveToasts: true,
    });
    await actor.get(`/notifications/${firstNotification.id}`).expect(404);

    await actor
      .post('/auth/switch-company')
      .send({ companyId: firstWorkspaceId })
      .expect(204);
    await expectWorkspaceState(actor, {
      registrationNumber: 'FIRST01',
      emailMode: 'OFF',
      showLiveToasts: false,
    });
    await actor.get(`/notifications/${secondNotification.id}`).expect(404);

    await actor
      .post('/auth/switch-company')
      .send({ companyId: secondWorkspaceId })
      .expect(204);
    await actor
      .get('/notifications')
      .expect(200)
      .expect(({ body }) => {
        expect(body.items).toHaveLength(1);
        expect(body.items[0].id).toBe(secondNotification.id);
      });

    const deliveries = await app
      .get(DataSource)
      .query<Array<{ companyId: string; count: number }>>(
        `SELECT "companyId", count(*)::int AS count
         FROM notification_deliveries
        GROUP BY "companyId"`,
      );
    expect(deliveries).toEqual([{ companyId: secondWorkspaceId, count: 1 }]);
  });

  it('registers every Notification Center entity and verifies migrated enums, checks, indexes, and tenant-safe foreign keys', async () => {
    const dataSource = app.get(DataSource);
    const notificationTables = [
      'notification_changes',
      'notification_deliveries',
      'notification_preferences',
      'notification_recipients',
      'notifications',
      'vehicle_deadline_alert_policies',
      'vehicle_deadline_notification_details',
    ];
    expect(
      dataSource.entityMetadatas
        .map(({ tableName }) => tableName)
        .filter((tableName) => notificationTables.includes(tableName))
        .sort(),
    ).toEqual(notificationTables);
    const tables = await dataSource.query<Array<{ table_name: string }>>(
      `SELECT table_name FROM information_schema.tables
        WHERE table_schema = current_schema() AND table_name = ANY($1)
        ORDER BY table_name`,
      [notificationTables],
    );
    expect(tables.map(({ table_name }) => table_name)).toEqual(
      notificationTables,
    );

    const enums = await dataSource.query<
      Array<{ type: string; values: string[] }>
    >(
      `SELECT type.typname AS type,
              array_agg(value.enumlabel::text ORDER BY value.enumsortorder) AS values
         FROM pg_type type
         JOIN pg_enum value ON value.enumtypid = type.oid
         JOIN pg_namespace namespace ON namespace.oid = type.typnamespace
        WHERE namespace.nspname = current_schema()
          AND type.typname = ANY($1)
        GROUP BY type.typname ORDER BY type.typname`,
      [
        [
          'notification_category',
          'notification_channel',
          'notification_delivery_status',
          'notification_email_mode',
          'notification_type',
          'vehicle_deadline_kind',
        ],
      ],
    );
    expect(enums).toEqual([
      {
        type: 'notification_category',
        values: [
          'FLEET_DEADLINES',
          'VEHICLE_ACCESS',
          'MEMBERSHIP',
          'SERVICE',
          'PRODUCT',
        ],
      },
      { type: 'notification_channel', values: ['EMAIL'] },
      {
        type: 'notification_delivery_status',
        values: ['PENDING', 'SENDING', 'SENT', 'FAILED', 'CANCELLED'],
      },
      { type: 'notification_email_mode', values: ['OFF', 'IMMEDIATE'] },
      {
        type: 'notification_type',
        values: ['VEHICLE_DEADLINE_REACHED'],
      },
      {
        type: 'vehicle_deadline_kind',
        values: ['OC', 'AC', 'TECHNICAL_INSPECTION'],
      },
    ]);

    const constraints = await dataSource.query<Array<{ conname: string }>>(
      `SELECT conname FROM pg_constraint
        WHERE connamespace = current_schema()::regnamespace
          AND conname = ANY($1)
        ORDER BY conname`,
      [
        [
          'CHK_notification_delivery_attempts',
          'CHK_vehicle_deadline_alert_policies_kinds',
          'CHK_vehicle_deadline_alert_policies_lead_days',
          'FK_notification_changes_membership',
          'FK_notification_delivery_recipient',
          'FK_notification_preferences_membership',
          'FK_notification_recipient_membership',
          'FK_notification_recipient_notification',
          'FK_vehicle_deadline_detail_notification',
          'FK_vehicle_deadline_detail_vehicle',
          'UQ_notification_delivery_channel',
          'UQ_notification_recipient_membership',
          'UQ_vehicle_deadline_notification_trigger',
        ],
      ],
    );
    expect(constraints.map(({ conname }) => conname)).toEqual([
      'CHK_notification_delivery_attempts',
      'CHK_vehicle_deadline_alert_policies_kinds',
      'CHK_vehicle_deadline_alert_policies_lead_days',
      'FK_notification_changes_membership',
      'FK_notification_delivery_recipient',
      'FK_notification_preferences_membership',
      'FK_notification_recipient_membership',
      'FK_notification_recipient_notification',
      'FK_vehicle_deadline_detail_notification',
      'FK_vehicle_deadline_detail_vehicle',
      'UQ_notification_delivery_channel',
      'UQ_notification_recipient_membership',
      'UQ_vehicle_deadline_notification_trigger',
    ]);
    const indexes = await dataSource.query<Array<{ indexname: string }>>(
      `SELECT indexname FROM pg_indexes
        WHERE schemaname = current_schema() AND indexname = ANY($1)
        ORDER BY indexname`,
      [
        [
          'IDX_notification_changes_createdAt',
          'IDX_notification_deliveries_due',
          'IDX_notification_recipients_membership',
        ],
      ],
    );
    expect(indexes.map(({ indexname }) => indexname)).toEqual([
      'IDX_notification_changes_createdAt',
      'IDX_notification_deliveries_due',
      'IDX_notification_recipients_membership',
    ]);

    const [firstCompany, secondCompany] = await dataSource.query<
      Array<{ id: string }>
    >(
      `INSERT INTO companies (name) VALUES ('Tenant A'), ('Tenant B') RETURNING id`,
    );
    const [firstUser, secondUser] = await dataSource.query<
      Array<{ id: string }>
    >(
      `INSERT INTO users (email) VALUES ('tenant-a@example.com'), ('tenant-b@example.com') RETURNING id`,
    );
    const [firstMembership, secondMembership] = await dataSource.query<
      Array<{ id: string }>
    >(
      `INSERT INTO memberships ("userId", "companyId", role)
       VALUES ($1, $3, 'OWNER'), ($2, $4, 'OWNER') RETURNING id`,
      [firstUser.id, secondUser.id, firstCompany.id, secondCompany.id],
    );
    const [{ id: notificationId }] = await dataSource.query<
      Array<{ id: string }>
    >(
      `INSERT INTO notifications
       ("companyId", type, category, "rendererVersion", "occurredAt")
       VALUES ($1, 'VEHICLE_DEADLINE_REACHED', 'FLEET_DEADLINES', 1, now())
       RETURNING id`,
      [secondCompany.id],
    );
    await expect(
      dataSource.query(
        `INSERT INTO notification_recipients
         ("companyId", "notificationId", "membershipId") VALUES ($1, $2, $3)`,
        [secondCompany.id, notificationId, firstMembership.id],
      ),
    ).rejects.toMatchObject({
      code: '23503',
      constraint: 'FK_notification_recipient_membership',
    });
    const [{ id: recipientId }] = await dataSource.query<Array<{ id: string }>>(
      `INSERT INTO notification_recipients
       ("companyId", "notificationId", "membershipId")
       VALUES ($1, $2, $3) RETURNING id`,
      [secondCompany.id, notificationId, secondMembership.id],
    );
    await expect(
      dataSource.query(
        `INSERT INTO notification_deliveries
         ("companyId", "recipientId", channel, "nextAttemptAt")
         VALUES ($1, $2, 'EMAIL', now())`,
        [firstCompany.id, recipientId],
      ),
    ).rejects.toMatchObject({
      code: '23503',
      constraint: 'FK_notification_delivery_recipient',
    });
  });

  it('cleans every registered Notification Center table between E2E scenarios', async () => {
    const actorEmail = 'notification-cleanup@example.com';
    await createVerifiedUser(app, actorEmail, 'Password123!');
    const actor = request.agent(app.getHttpServer());
    await actor
      .post('/auth/signin')
      .send({ email: actorEmail, password: 'Password123!' })
      .expect(201);
    await actor
      .patch('/notification-preferences/me')
      .send({
        preferences: [{ category: 'FLEET_DEADLINES', showLiveToasts: false }],
      })
      .expect(200);
    await actor
      .post('/vehicles')
      .send({
        brand: 'Cleanup',
        model: 'Proof',
        registrationNumber: 'CLEAN01',
        ocExpiry: '2026-04-13',
      })
      .expect(201);

    await truncateTestTables();

    const [counts] = await app.get(DataSource).query(`SELECT
      (SELECT count(*)::int FROM vehicle_deadline_alert_policies) policies,
      (SELECT count(*)::int FROM notification_preferences) preferences,
      (SELECT count(*)::int FROM notifications) notifications,
      (SELECT count(*)::int FROM vehicle_deadline_notification_details) details,
      (SELECT count(*)::int FROM notification_recipients) recipients,
      (SELECT count(*)::int FROM notification_deliveries) deliveries,
      (SELECT count(*)::int FROM notification_changes) changes`);
    expect(counts).toEqual({
      policies: 0,
      preferences: 0,
      notifications: 0,
      details: 0,
      recipients: 0,
      deliveries: 0,
      changes: 0,
    });
  });
});

async function expectWorkspaceState(
  actor: ReturnType<typeof request.agent>,
  expected: {
    registrationNumber: string;
    emailMode: 'OFF' | 'IMMEDIATE';
    showLiveToasts: boolean;
  },
): Promise<void> {
  await actor
    .get('/notification-preferences/me')
    .expect(200)
    .expect(({ body }) => {
      expect(body.preferences).toContainEqual({
        category: 'FLEET_DEADLINES',
        emailMode: expected.emailMode,
        showLiveToasts: expected.showLiveToasts,
      });
    });
  await actor
    .get('/vehicle-deadline-alerts')
    .expect(200)
    .expect(({ body }) => {
      expect(body.items).toHaveLength(1);
      expect(body.items[0].vehicle.registrationNumber).toBe(
        expected.registrationNumber,
      );
    });
  await actor
    .get('/notifications')
    .expect(200)
    .expect(({ body }) => {
      expect(body.items).toHaveLength(1);
      expect(body.items[0].registrationNumber).toBe(
        expected.registrationNumber,
      );
    });
  await actor
    .get('/notification-center/summary')
    .expect(200, { activeAlertCount: 1, unreadNotificationCount: 1 });
}
