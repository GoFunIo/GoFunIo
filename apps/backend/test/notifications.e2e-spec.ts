import { INestApplication } from '@nestjs/common';
import { DataSource } from 'typeorm';
import request from 'supertest';
import { App } from 'supertest/types';
import { createTestApp } from './helpers/create-test-app';
import {
  captureEmittedEvents,
  createVerifiedUser,
} from './helpers/auth-test-utils';
import {
  NOTIFICATION_TYPES,
  NotificationEmailPolicy,
  NotificationRecipientBehavior,
} from '../src/notifications/notification-types';
import { NotificationType } from '../src/notifications/notification.entity';
import { MembershipRole } from '../src/users/membership-role';
import { SwaggerModule } from '@nestjs/swagger';
import { createSwaggerConfig } from '../src/swagger-document';

describe('Vehicle deadline Notifications (e2e)', () => {
  let app: INestApplication<App>;
  let instant = new Date('2026-03-30T06:00:00.000Z'); // 08:00 Europe/Warsaw

  beforeAll(async () => {
    app = (await createTestApp({
      clock: { now: () => new Date(instant) },
    })) as INestApplication<App>;
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

  async function invite(
    actor: ReturnType<typeof request.agent>,
    email: string,
    role: MembershipRole,
  ) {
    const events = captureEmittedEvents(app);
    try {
      const response = await actor
        .post('/users')
        .send({ email, role })
        .expect(201);
      await request(app.getHttpServer())
        .post('/auth/reset-password')
        .send({
          token: events.passwordResetToken,
          password: 'Invited-password1!',
        })
        .expect(204);
      const agent = request.agent(app.getHttpServer());
      await agent
        .post('/auth/signin')
        .send({ email, password: 'Invited-password1!' })
        .expect(201);
      return { agent, userId: response.body.id as string };
    } finally {
      events.restore();
    }
  }

  it('registers the typed VEHICLE_DEADLINE_REACHED contract', () => {
    expect(
      NOTIFICATION_TYPES[NotificationType.VEHICLE_DEADLINE_REACHED],
    ).toMatchObject({
      category: 'FLEET_DEADLINES',
      recipientBehavior: NotificationRecipientBehavior.SOURCE_SCOPED,
      emailPolicy: NotificationEmailPolicy.OPTIONAL,
      rendererVersion: 1,
      validityEvaluator: expect.any(Function),
      detailAdapter: expect.any(Function),
      dtoRenderer: expect.any(Function),
      emailRenderer: expect.any(Function),
    });
  });

  it('documents list, detail, typed DTOs, and errors in Swagger', () => {
    const document = SwaggerModule.createDocument(app, createSwaggerConfig());
    expect(document.paths['/notifications']?.get?.responses).toHaveProperty(
      '200',
    );
    expect(document.paths['/notifications']?.get?.responses).toHaveProperty(
      '401',
    );
    expect(
      document.paths['/notifications/{id}']?.get?.responses,
    ).toHaveProperty('200');
    expect(
      document.paths['/notifications/{id}']?.get?.responses,
    ).toHaveProperty('404');
    expect(document.components?.schemas).toHaveProperty(
      'VehicleDeadlineNotificationDto',
    );
    expect(document.components?.schemas).toHaveProperty(
      'NotificationActionDto',
    );
  });

  it('atomically persists one current stage and exposes typed list/detail', async () => {
    const actor = await owner('notification-owner@example.com');
    const vehicle = await actor
      .post('/vehicles')
      .send({
        brand: 'Toyota',
        model: 'Corolla',
        registrationNumber: 'NOT001',
        ocExpiry: '2026-04-13',
      })
      .expect(201);

    const list = await actor.get('/notifications').expect(200);
    expect(list.body.items).toHaveLength(1);
    expect(list.body.items[0]).toMatchObject({
      type: 'VEHICLE_DEADLINE_REACHED',
      category: 'FLEET_DEADLINES',
      rendererVersion: 1,
      vehicleId: vehicle.body.id,
      deadlineKind: 'OC',
      deadlineDate: '2026-04-13',
      leadDay: 14,
      registrationNumber: 'NOT001',
      action: { type: 'OPEN_VEHICLE', vehicleId: vehicle.body.id },
    });
    await actor
      .get(`/notifications/${list.body.items[0].id}`)
      .expect(200)
      .expect(list.body.items[0]);

    const rows = await app.get(DataSource).query(`
      SELECT (SELECT count(*)::int FROM notifications) notifications,
             (SELECT count(*)::int FROM notification_recipients) recipients,
             (SELECT count(*)::int FROM notification_deliveries) deliveries`);
    expect(rows[0]).toEqual({ notifications: 1, recipients: 1, deliveries: 1 });
  });

  it('gates generation before 08:00 and generates exactly at 08:00', async () => {
    instant = new Date('2026-03-30T05:59:59.000Z');
    const actor = await owner('notification-clock@example.com');
    const first = await actor
      .post('/vehicles')
      .send({
        brand: 'Ford',
        model: 'Focus',
        registrationNumber: 'CLOCKN1',
        acExpiry: '2026-04-29',
      })
      .expect(201);
    await actor.get('/notifications').expect(200).expect({ items: [] });
    instant = new Date('2026-03-30T06:00:00.000Z');
    await actor
      .patch(`/vehicles/${first.body.id}`)
      .send({ acExpiry: '2026-04-28' })
      .expect(200);
    await actor
      .get('/notifications')
      .expect(200)
      .expect(({ body }) => {
        expect(body.items).toHaveLength(1);
        expect(body.items[0]).toMatchObject({
          deadlineKind: 'AC',
          leadDay: 30,
        });
      });
  });

  it('does not generate for an unrelated update or unchanged deadline and stores a new date separately', async () => {
    instant = new Date('2026-03-30T06:00:00.000Z');
    const actor = await owner('notification-update@example.com');
    const vehicle = await actor
      .post('/vehicles')
      .send({
        brand: 'Volvo',
        model: 'V60',
        registrationNumber: 'UPDN01',
        technicalInspectionExpiry: '2026-04-06',
      })
      .expect(201);
    await actor
      .patch(`/vehicles/${vehicle.body.id}`)
      .send({ notes: 'unchanged source' })
      .expect(200);
    await actor
      .patch(`/vehicles/${vehicle.body.id}`)
      .send({ technicalInspectionExpiry: '2026-04-06' })
      .expect(200);
    expect(
      (await actor.get('/notifications').expect(200)).body.items,
    ).toHaveLength(1);
    await actor
      .patch(`/vehicles/${vehicle.body.id}`)
      .send({ technicalInspectionExpiry: '2026-04-05' })
      .expect(200);
    expect(
      (await actor.get('/notifications').expect(200)).body.items,
    ).toHaveLength(1);
    const [{ count }] = await app
      .get(DataSource)
      .query(
        `SELECT count(*)::int count FROM vehicle_deadline_notification_details WHERE "vehicleId" = $1`,
        [vehicle.body.id],
      );
    expect(count).toBe(2);
  });

  it('selects active OWNER, ADMIN, and assigned MANAGER recipients and follows effective e-mail preferences', async () => {
    const actor = await owner('notification-recipients@example.com');
    const admin = await invite(
      actor,
      'notification-admin@example.com',
      MembershipRole.ADMIN,
    );
    const manager = await invite(
      actor,
      'notification-manager@example.com',
      MembershipRole.MANAGER,
    );
    await admin.agent
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
    const vehicle = await actor
      .post('/vehicles')
      .send({
        brand: 'Kia',
        model: 'Ceed',
        registrationNumber: 'RECIP01',
        ocExpiry: '2026-04-29',
      })
      .expect(201);
    await actor
      .post(`/vehicles/${vehicle.body.id}/managers`)
      .send({ managerId: manager.userId })
      .expect(201);
    await actor
      .patch(`/vehicles/${vehicle.body.id}`)
      .send({ ocExpiry: '2026-04-13' })
      .expect(200);

    const rows = await app.get(DataSource).query(
      `
      SELECT m.role, count(d.id)::int deliveries
      FROM notification_recipients r
      JOIN memberships m ON m.id = r."membershipId" AND m."companyId" = r."companyId"
      LEFT JOIN notification_deliveries d ON d."recipientId" = r.id AND d."companyId" = r."companyId"
      JOIN vehicle_deadline_notification_details nd ON nd."notificationId" = r."notificationId"
      WHERE nd."vehicleId" = $1 AND nd."deadlineDate" = '2026-04-13'
      GROUP BY m.role ORDER BY m.role`,
      [vehicle.body.id],
    );
    expect(
      rows.sort((a: { role: string }, b: { role: string }) =>
        a.role.localeCompare(b.role),
      ),
    ).toEqual([
      { role: 'ADMIN', deliveries: 0 },
      { role: 'MANAGER', deliveries: 1 },
      { role: 'OWNER', deliveries: 1 },
    ]);
    expect(
      (await manager.agent.get('/notifications').expect(200)).body.items,
    ).toHaveLength(1);
    await actor
      .delete(`/vehicles/${vehicle.body.id}/managers/${manager.userId}`)
      .expect(204);
    await manager.agent.get('/notifications').expect(200).expect({ items: [] });
  });

  it('suppresses disabled kinds, pre-activation work, and due-day catch-up older than seven days', async () => {
    const actor = await owner('notification-policy-boundaries@example.com');
    await actor
      .patch('/alert-policy')
      .send({ enabledDeadlineKinds: ['OC'], leadDays: [0] })
      .expect(200);
    await actor
      .post('/vehicles')
      .send({
        brand: 'Old',
        model: 'Due',
        registrationNumber: 'OLDUE01',
        ocExpiry: '2026-03-22',
        acExpiry: '2026-03-30',
      })
      .expect(201);
    await actor.get('/notifications').expect(200).expect({ items: [] });
  });

  it('deduplicates concurrent equivalent deadline updates', async () => {
    const actor = await owner('notification-concurrent@example.com');
    const vehicle = await actor
      .post('/vehicles')
      .send({
        brand: 'Seat',
        model: 'Leon',
        registrationNumber: 'CONCUR1',
        ocExpiry: '2026-06-01',
      })
      .expect(201);
    const responses = await Promise.all([
      actor
        .patch(`/vehicles/${vehicle.body.id}`)
        .send({ ocExpiry: '2026-04-13' }),
      actor
        .patch(`/vehicles/${vehicle.body.id}`)
        .send({ ocExpiry: '2026-04-13' }),
    ]);
    expect(responses.map(({ status }) => status)).toEqual([200, 200]);
    const [{ count }] = await app
      .get(DataSource)
      .query(
        `SELECT count(*)::int count FROM vehicle_deadline_notification_details WHERE "vehicleId" = $1`,
        [vehicle.body.id],
      );
    expect(count).toBe(1);
  });

  it('rolls back Vehicle, Notification, Recipient, and Delivery when the source transaction fails', async () => {
    const actor = await owner('notification-rollback@example.com');
    const dataSource = app.get(DataSource);
    await dataSource.query(
      `ALTER TABLE notification_deliveries ADD CONSTRAINT "CK_e2e_notification_failure" CHECK ("recipientId" IS NULL)`,
    );
    try {
      await actor
        .post('/vehicles')
        .send({
          brand: 'Rollback',
          model: 'Source',
          registrationNumber: 'ROLLN01',
          ocExpiry: '2026-04-13',
        })
        .expect(500);
    } finally {
      await dataSource.query(
        `ALTER TABLE notification_deliveries DROP CONSTRAINT "CK_e2e_notification_failure"`,
      );
    }
    const [counts] = await dataSource.query(`SELECT
      (SELECT count(*)::int FROM vehicles WHERE "registrationNumber" = 'ROLLN01') vehicles,
      (SELECT count(*)::int FROM notifications) notifications,
      (SELECT count(*)::int FROM notification_recipients) recipients,
      (SELECT count(*)::int FROM notification_deliveries) deliveries`);
    expect(counts).toEqual({
      vehicles: 0,
      notifications: 0,
      recipients: 0,
      deliveries: 0,
    });
  });

  it('masks Notification list and detail across Workspaces', async () => {
    const first = await owner('notification-isolation-first@example.com');
    const second = await owner('notification-isolation-second@example.com');
    await first
      .post('/vehicles')
      .send({
        brand: 'Private',
        model: 'Vehicle',
        registrationNumber: 'ISO001',
        ocExpiry: '2026-04-13',
      })
      .expect(201);
    const notification = (await first.get('/notifications').expect(200)).body
      .items[0];
    await second.get('/notifications').expect(200).expect({ items: [] });
    await second.get(`/notifications/${notification.id}`).expect(404);
  });

  it('schema has typed columns, tenant-safe constraints, and clean down/up without an Alert table', async () => {
    const dataSource = app.get(DataSource);
    const columns =
      await dataSource.query(`SELECT table_name, column_name, data_type
      FROM information_schema.columns WHERE table_schema = current_schema()
        AND table_name IN ('notifications', 'vehicle_deadline_notification_details', 'notification_recipients', 'notification_deliveries')`);
    expect(
      columns.some(
        (column: { data_type: string }) => column.data_type === 'jsonb',
      ),
    ).toBe(false);
    expect(
      columns.some((column: { column_name: string }) =>
        /html|url|payload/i.test(column.column_name),
      ),
    ).toBe(false);
    const [{ alertTable }] = await dataSource.query(
      `SELECT to_regclass('vehicle_deadline_alerts') AS "alertTable"`,
    );
    expect(alertTable).toBeNull();
    const constraints =
      await dataSource.query(`SELECT conname FROM pg_constraint
      WHERE conname IN ('UQ_vehicle_deadline_notification_trigger', 'UQ_notification_recipient_membership',
        'UQ_notification_delivery_channel', 'FK_vehicle_deadline_detail_vehicle',
        'FK_notification_recipient_membership', 'FK_notification_delivery_recipient')`);
    expect(constraints).toHaveLength(6);
    await dataSource.undoLastMigration();
    expect(
      (
        await dataSource.query(`SELECT to_regclass('notifications') AS table`)
      )[0].table,
    ).toBeNull();
    await dataSource.runMigrations();
    expect(
      (
        await dataSource.query(`SELECT to_regclass('notifications') AS table`)
      )[0].table,
    ).toBe('notifications');

    const [firstCompany, secondCompany] = await dataSource.query(
      `INSERT INTO companies (name) VALUES ('First tenant'), ('Second tenant') RETURNING id`,
    );
    const [{ id: vehicleId }] = await dataSource.query(
      `INSERT INTO vehicles ("companyId", brand, model, "registrationNumber") VALUES ($1, 'Tenant', 'Vehicle', 'TENANT1') RETURNING id`,
      [firstCompany.id],
    );
    const [{ id: notificationId }] = await dataSource.query(
      `INSERT INTO notifications ("companyId", type, category, "rendererVersion", "occurredAt")
       VALUES ($1, 'VEHICLE_DEADLINE_REACHED', 'FLEET_DEADLINES', 1, now()) RETURNING id`,
      [secondCompany.id],
    );
    await expect(
      dataSource.query(
        `INSERT INTO vehicle_deadline_notification_details
       ("notificationId", "companyId", "vehicleId", "deadlineKind", "deadlineDate", "leadDay", "registrationNumberSnapshot")
       VALUES ($1, $2, $3, 'OC', '2026-04-01', 7, 'TENANT1')`,
        [notificationId, secondCompany.id, vehicleId],
      ),
    ).rejects.toMatchObject({ code: '23503' });
  });
});
