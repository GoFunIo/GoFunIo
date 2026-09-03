import { INestApplication, Logger } from '@nestjs/common';
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
import {
  VehicleDeadlineReconciliation,
  VehicleDeadlineReconciliationStore,
} from '../src/notifications/vehicle-deadline-reconciliation';

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

  it('documents the complete inbox contract and exposes no delete, dismiss, or unarchive operation', () => {
    const document = SwaggerModule.createDocument(app, createSwaggerConfig());
    const list = document.paths['/notifications']?.get;
    expect(list?.responses).toHaveProperty('200');
    expect(list?.responses).toHaveProperty('400');
    expect(list?.responses).toHaveProperty('401');
    expect(list?.responses).toHaveProperty('403');
    expect(list?.description).toMatch(/cookie.*Active Workspace.*tenant/is);
    expect(list?.parameters).toEqual(
      expect.arrayContaining(
        ['category', 'unread', 'archived', 'limit', 'cursor'].map((name) =>
          expect.objectContaining({ name, in: 'query' }),
        ),
      ),
    );
    expect(
      list?.parameters?.find(
        (parameter) => 'name' in parameter && parameter.name === 'limit',
      ),
    ).toMatchObject({
      schema: { default: 20, minimum: 1, maximum: 100 },
    });
    expect(
      list?.parameters?.find(
        (parameter) => 'name' in parameter && parameter.name === 'cursor',
      ),
    ).toMatchObject({
      description: expect.stringContaining('createdAt'),
    });
    expect(
      list?.parameters?.find(
        (parameter) => 'name' in parameter && parameter.name === 'archived',
      ),
    ).toMatchObject({
      schema: expect.objectContaining({ default: false }),
    });
    const detail = document.paths['/notifications/{id}']?.get;
    expect(detail?.responses).toHaveProperty('200');
    expect(detail?.responses).toHaveProperty('400');
    expect(detail?.responses).toHaveProperty('401');
    expect(detail?.responses).toHaveProperty('403');
    expect(detail?.responses).toHaveProperty('404');
    expect(detail?.description).toMatch(/action descriptor.*current/is);

    const stream = document.paths['/notifications/stream']?.get;
    expect(stream?.responses).toHaveProperty('400');
    expect(stream?.description).toMatch(/no business payload/is);
    expect(stream?.description).toMatch(/refetch.*GET/is);

    const alerts = document.paths['/vehicle-deadline-alerts']?.get;
    expect(alerts?.responses).toHaveProperty('403');
    expect(alerts?.description).toMatch(/Vehicle Access.*opaque cursor/is);

    const summary = document.paths['/notification-center/summary']?.get;
    expect(summary?.responses).toHaveProperty('403');
    expect(summary?.description).toMatch(
      /active Alert count.*unread Notification count/is,
    );

    const preferences = document.paths['/notification-preferences/me']?.get;
    expect(preferences?.description).toMatch(/Active Workspace.*defaults/is);

    const policy = document.paths['/alert-policy']?.get;
    expect(policy?.responses).toHaveProperty('403');
    expect(policy?.description).toMatch(/Active Workspace.*tenant/is);

    for (const [path, method] of [
      ['/notifications/{id}/read', 'patch'],
      ['/notifications/{id}/archive', 'patch'],
      ['/notifications/read-all', 'post'],
    ] as const) {
      const operation = document.paths[path]?.[method];
      expect(operation?.responses).toHaveProperty('200');
      expect(operation?.responses).toHaveProperty('400');
      expect(operation?.responses).toHaveProperty('401');
      expect(operation?.responses).toHaveProperty('403');
      expect(operation?.parameters).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ name: 'Origin', in: 'header' }),
        ]),
      );
    }
    expect(
      document.paths['/notifications/read-all']?.post?.requestBody,
    ).toBeDefined();
    expect(document.paths['/notifications/{id}']).not.toHaveProperty('delete');
    expect(document.paths['/notifications/{id}/dismiss']).toBeUndefined();
    expect(document.paths['/notifications/{id}/unarchive']).toBeUndefined();

    const schemas = document.components?.schemas ?? {};
    expect(schemas).toHaveProperty('VehicleDeadlineNotificationDto');
    expect(schemas).toHaveProperty('NotificationActionDto');
    expect(schemas).toHaveProperty('NotificationListDto');
    expect(schemas).toHaveProperty('ReadAllNotificationsDto');
    expect(schemas).toHaveProperty('ReadAllNotificationsResultDto');
    expect(schemas.VehicleDeadlineNotificationDto).toMatchObject({
      required: expect.arrayContaining([
        'id',
        'createdAt',
        'readAt',
        'archivedAt',
        'action',
      ]),
    });
    expect(schemas.NotificationListDto).toMatchObject({
      required: expect.arrayContaining(['items', 'nextCursor']),
    });

    const summarySchema = schemas.NotificationCenterSummaryDto;
    if (!summarySchema || !('properties' in summarySchema)) {
      throw new Error('Expected inline summary schema');
    }
    expect(summarySchema.properties?.activeAlertCount).toMatchObject({
      description: expect.stringContaining('Vehicle visibility'),
    });
    expect(summarySchema.properties?.unreadNotificationCount).toMatchObject({
      description: expect.stringMatching(
        /valid.*authorized.*unrevoked.*unarchived/i,
      ),
    });
  });

  it('atomically persists one current stage and exposes typed list/detail', async () => {
    const log = jest.spyOn(Logger.prototype, 'log').mockImplementation();
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
    expect(log).toHaveBeenCalledWith(
      expect.stringContaining('"event":"notification_generated"'),
    );
    const generated = log.mock.calls
      .map(([entry]) => String(entry))
      .find((entry) => entry.includes('notification_generated'));
    expect(generated).toBeDefined();
    expect(generated).not.toContain('NOT001');
    expect(generated).not.toContain('2026-04-13');
    log.mockRestore();
  });

  it('paginates newest-first with an opaque cursor that stays stable across concurrent inserts', async () => {
    instant = new Date('2026-03-30T06:00:00.000Z');
    const actor = await owner('notification-pagination@example.com');
    const dataSource = app.get(DataSource);

    for (const [registrationNumber, createdAt] of [
      ['PAGE001', '2026-03-30T06:01:00.000Z'],
      ['PAGE002', '2026-03-30T06:02:00.000Z'],
      ['PAGE003', '2026-03-30T06:03:00.000Z'],
    ] as const) {
      await actor
        .post('/vehicles')
        .send({
          brand: 'Toyota',
          model: 'Corolla',
          registrationNumber,
          ocExpiry: '2026-04-13',
        })
        .expect(201);
      await dataSource.query(
        `UPDATE notifications notification
         SET "createdAt" = $1
         FROM vehicle_deadline_notification_details detail
         WHERE detail."notificationId" = notification.id
           AND detail."registrationNumberSnapshot" = $2`,
        [createdAt, registrationNumber],
      );
    }

    const first = await actor
      .get('/notifications')
      .query({ limit: 2 })
      .expect(200);
    expect(
      first.body.items.map(
        ({ vehicle }: { vehicle: { registrationNumber: string } }) =>
          vehicle.registrationNumber,
      ),
    ).toEqual(['PAGE003', 'PAGE002']);
    expect(first.body.nextCursor).toEqual(expect.any(String));
    expect(first.body.nextCursor).not.toContain(first.body.items[1].id);

    await actor
      .post('/vehicles')
      .send({
        brand: 'Toyota',
        model: 'Corolla',
        registrationNumber: 'PAGE004',
        ocExpiry: '2026-04-13',
      })
      .expect(201);
    await dataSource.query(
      `UPDATE notifications notification
       SET "createdAt" = '2026-03-30T06:04:00.000Z'
       FROM vehicle_deadline_notification_details detail
       WHERE detail."notificationId" = notification.id
         AND detail."registrationNumberSnapshot" = 'PAGE004'`,
    );

    const second = await actor
      .get('/notifications')
      .query({ limit: 2, cursor: first.body.nextCursor })
      .expect(200);
    expect(
      second.body.items.map(
        ({ vehicle }: { vehicle: { registrationNumber: string } }) =>
          vehicle.registrationNumber,
      ),
    ).toEqual(['PAGE001']);
    expect(second.body.nextCursor).toBeNull();
  });

  it('preserves PostgreSQL microsecond precision in the createdAt cursor position', async () => {
    const actor = await owner('notification-cursor-precision@example.com');
    const dataSource = app.get(DataSource);
    for (const [registrationNumber, createdAt] of [
      ['MICRO01', '2026-03-30T06:00:00.123400Z'],
      ['MICRO02', '2026-03-30T06:00:00.123500Z'],
      ['MICRO03', '2026-03-30T06:00:00.123600Z'],
    ] as const) {
      await actor
        .post('/vehicles')
        .send({
          brand: 'Toyota',
          model: 'Corolla',
          registrationNumber,
          ocExpiry: '2026-04-13',
        })
        .expect(201);
      await dataSource.query(
        `UPDATE notifications notification
         SET "createdAt" = $1
         FROM vehicle_deadline_notification_details detail
         WHERE detail."notificationId" = notification.id
           AND detail."registrationNumberSnapshot" = $2`,
        [createdAt, registrationNumber],
      );
    }

    const first = await actor
      .get('/notifications')
      .query({ limit: 1 })
      .expect(200);
    const second = await actor
      .get('/notifications')
      .query({ limit: 1, cursor: first.body.nextCursor })
      .expect(200);
    const third = await actor
      .get('/notifications')
      .query({ limit: 1, cursor: second.body.nextCursor })
      .expect(200);
    expect(
      [first, second, third].map(
        ({ body }) => body.items[0].vehicle.registrationNumber,
      ),
    ).toEqual(['MICRO03', 'MICRO02', 'MICRO01']);
    expect(third.body.nextCursor).toBeNull();
  });

  it('filters the personal inbox by category, unread, and archive state', async () => {
    const actor = await owner('notification-filters@example.com');
    for (const registrationNumber of ['FILTER1', 'FILTER2', 'FILTER3']) {
      await actor
        .post('/vehicles')
        .send({
          brand: 'Skoda',
          model: 'Octavia',
          registrationNumber,
          ocExpiry: '2026-04-13',
        })
        .expect(201);
    }
    const items = (await actor.get('/notifications').query({ limit: 100 })).body
      .items as Array<{ id: string; vehicle: { registrationNumber: string } }>;
    const read = items.find(
      ({ vehicle }) => vehicle.registrationNumber === 'FILTER1',
    )!;
    const archived = items.find(
      ({ vehicle }) => vehicle.registrationNumber === 'FILTER2',
    )!;
    await actor.patch(`/notifications/${read.id}/read`).expect(200);
    await actor.patch(`/notifications/${archived.id}/archive`).expect(200);

    await actor
      .get('/notifications')
      .expect(200)
      .expect(({ body }) => expect(body.items).toHaveLength(2));
    await actor
      .get('/notifications')
      .query({ unread: true })
      .expect(200)
      .expect(({ body }) => {
        expect(body.items).toHaveLength(1);
        expect(body.items[0]).toMatchObject({
          registrationNumber: 'FILTER3',
          readAt: null,
          archivedAt: null,
        });
      });
    await actor
      .get('/notifications')
      .query({ unread: false })
      .expect(200)
      .expect(({ body }) => {
        expect(body.items).toHaveLength(1);
        expect(body.items[0]).toMatchObject({
          registrationNumber: 'FILTER1',
          archivedAt: null,
        });
      });
    await actor
      .get('/notifications')
      .query({ archived: true, unread: false })
      .expect(200)
      .expect(({ body }) => {
        expect(body.items).toHaveLength(1);
        expect(body.items[0]).toMatchObject({
          registrationNumber: 'FILTER2',
          readAt: expect.any(String),
          archivedAt: expect.any(String),
        });
      });
    await actor
      .get('/notifications')
      .query({ category: 'FLEET_DEADLINES' })
      .expect(200)
      .expect(({ body }) => expect(body.items).toHaveLength(2));
    await actor
      .get('/notifications')
      .query({ category: 'SERVICE' })
      .expect(200)
      .expect(({ body }) => expect(body.items).toEqual([]));
  });

  it('uses limit 20 by default, accepts 100, preserves id tie-break order, and rejects invalid cursors or query input', async () => {
    const actor = await owner('notification-list-validation@example.com');
    const dataSource = app.get(DataSource);
    for (let index = 0; index < 21; index += 1) {
      await actor
        .post('/vehicles')
        .send({
          brand: 'Seat',
          model: 'Leon',
          registrationNumber: `LIM${String(index).padStart(3, '0')}`,
          ocExpiry: '2026-04-13',
        })
        .expect(201);
    }
    await dataSource.query(
      `UPDATE notifications SET "createdAt" = '2026-03-30T07:00:00.000Z'`,
    );
    const expectedIds = (
      await dataSource.query<Array<{ id: string }>>(
        `SELECT id FROM notifications ORDER BY "createdAt" DESC, id DESC`,
      )
    ).map(({ id }) => id);
    const defaultPage = await actor.get('/notifications').expect(200);
    expect(defaultPage.body.items).toHaveLength(20);
    expect(defaultPage.body.nextCursor).toEqual(expect.any(String));
    expect(defaultPage.body.items.map(({ id }: { id: string }) => id)).toEqual(
      expectedIds.slice(0, 20),
    );
    await actor
      .get('/notifications')
      .query({ limit: 100 })
      .expect(200)
      .expect(({ body }) => {
        expect(body.items).toHaveLength(21);
        expect(body.items.map(({ id }: { id: string }) => id)).toEqual(
          expectedIds,
        );
      });

    const tampered = `${defaultPage.body.nextCursor.slice(0, -1)}x`;
    for (const query of [
      { limit: 0 },
      { limit: 101 },
      { limit: 'many' },
      { category: 'UNKNOWN' },
      { unread: 'yes' },
      { archived: 'yes' },
      { cursor: 'invalid' },
      { cursor: tampered },
      { cursor: defaultPage.body.nextCursor, unread: true },
      { companyId: '00000000-0000-0000-0000-000000000000' },
    ]) {
      await actor.get('/notifications').query(query).expect(400);
    }

    const foreign = await owner('notification-list-cursor-foreign@example.com');
    await foreign
      .get('/notifications')
      .query({ cursor: defaultPage.body.nextCursor })
      .expect(400);
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
    await actor
      .get('/notifications')
      .expect(200)
      .expect(({ body }) => expect(body.items).toEqual([]));
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

  it('generates scheduled stages through the explicit deterministic cycle', async () => {
    instant = new Date('2026-03-30T05:59:59.000Z');
    const actor = await owner('notification-reconcile-stage@example.com');
    await actor
      .post('/vehicles')
      .send({
        brand: 'Skoda',
        model: 'Octavia',
        registrationNumber: 'SCHED01',
        ocExpiry: '2026-04-29',
      })
      .expect(201);
    instant = new Date('2026-03-30T06:00:00.000Z');
    await app.get(VehicleDeadlineReconciliation).processDue();
    await actor
      .get('/notifications')
      .expect(200)
      .expect(({ body }) => {
        expect(body.items).toHaveLength(1);
        expect(body.items[0]).toMatchObject({
          deadlineKind: 'OC',
          leadDay: 30,
        });
      });
  });

  it('progresses every deadline kind and skips an outage-missed stage', async () => {
    instant = new Date('2026-03-30T05:59:59.000Z');
    const actor = await owner('notification-reconcile-progression@example.com');
    await actor
      .post('/vehicles')
      .send({
        brand: 'BMW',
        model: '320',
        registrationNumber: 'PROGR01',
        ocExpiry: '2026-04-29',
        acExpiry: '2026-04-29',
        technicalInspectionExpiry: '2026-04-29',
      })
      .expect(201);
    const processor = app.get(VehicleDeadlineReconciliation);
    instant = new Date('2026-03-30T06:00:00.000Z');
    await processor.processDue();
    instant = new Date('2026-04-23T06:00:00.000Z');
    await processor.processDue();
    const details = await app.get(DataSource).query(
      `SELECT "deadlineKind", "leadDay" FROM vehicle_deadline_notification_details
       ORDER BY "deadlineKind", "leadDay" DESC`,
    );
    expect(details).toEqual([
      { deadlineKind: 'OC', leadDay: 30 },
      { deadlineKind: 'OC', leadDay: 7 },
      { deadlineKind: 'AC', leadDay: 30 },
      { deadlineKind: 'AC', leadDay: 7 },
      { deadlineKind: 'TECHNICAL_INSPECTION', leadDay: 30 },
      { deadlineKind: 'TECHNICAL_INSPECTION', leadDay: 7 },
    ]);
  });

  it('honors policy edits, preserves removed lead stages, and invalidates disabled kinds and removed Vehicles', async () => {
    instant = new Date('2026-03-30T06:00:00.000Z');
    const actor = await owner('notification-reconcile-policy-edit@example.com');
    const first = await actor
      .post('/vehicles')
      .send({
        brand: 'Audi',
        model: 'A4',
        registrationNumber: 'POLICY1',
        ocExpiry: '2026-04-29',
      })
      .expect(201);
    const second = await actor
      .post('/vehicles')
      .send({
        brand: 'Audi',
        model: 'A6',
        registrationNumber: 'POLICY2',
        acExpiry: '2026-04-29',
      })
      .expect(201);
    await actor
      .patch('/alert-policy')
      .send({ leadDays: [14, 7, 0] })
      .expect(200);
    await app.get(VehicleDeadlineReconciliation).processDue();
    let rows = await app.get(DataSource).query(
      `SELECT detail."vehicleId", notification."invalidatedAt"
       FROM notifications notification
       JOIN vehicle_deadline_notification_details detail ON detail."notificationId" = notification.id
       ORDER BY detail."vehicleId"`,
    );
    expect(rows).toHaveLength(2);
    expect(
      rows.every(
        ({ invalidatedAt }: { invalidatedAt: Date | null }) =>
          invalidatedAt === null,
      ),
    ).toBe(true);

    await actor
      .patch('/alert-policy')
      .send({ enabledDeadlineKinds: ['AC', 'TECHNICAL_INSPECTION'] })
      .expect(200);
    await actor.delete(`/vehicles/${second.body.id}`).expect(204);
    await app.get(VehicleDeadlineReconciliation).processDue();
    rows = await app.get(DataSource).query(
      `SELECT detail."vehicleId", notification."invalidatedAt"
       FROM notifications notification
       JOIN vehicle_deadline_notification_details detail ON detail."notificationId" = notification.id`,
    );
    expect(
      rows.find(
        ({ vehicleId }: { vehicleId: string }) => vehicleId === first.body.id,
      ).invalidatedAt,
    ).toEqual(instant);
    expect(
      rows.find(
        ({ vehicleId }: { vehicleId: string }) => vehicleId === second.body.id,
      ).invalidatedAt,
    ).toEqual(instant);
  });

  it('deduplicates concurrent cycles through PostgreSQL', async () => {
    const log = jest.spyOn(Logger.prototype, 'log').mockImplementation();
    instant = new Date('2026-03-30T05:59:59.000Z');
    const actor = await owner('notification-reconcile-concurrent@example.com');
    const vehicle = await actor
      .post('/vehicles')
      .send({
        brand: 'Mazda',
        model: '6',
        registrationNumber: 'SCHED02',
        acExpiry: '2026-04-29',
      })
      .expect(201);
    instant = new Date('2026-03-30T06:00:00.000Z');
    const store = app.get(VehicleDeadlineReconciliationStore);
    await Promise.all([store.run(), store.run()]);
    const [{ count }] = await app
      .get(DataSource)
      .query(
        `SELECT count(*)::int count FROM vehicle_deadline_notification_details WHERE "vehicleId" = $1`,
        [vehicle.body.id],
      );
    expect(count).toBe(1);
    expect(log).toHaveBeenCalledWith(
      expect.stringContaining('"event":"notification_deduplicated"'),
    );
    log.mockRestore();
  });

  it('atomically invalidates stale sources, cancels nonterminal deliveries, and retains terminal ones', async () => {
    instant = new Date('2026-03-30T06:00:00.000Z');
    const actor = await owner('notification-reconcile-invalid@example.com');
    await invite(
      actor,
      'notification-reconcile-invalid-admin@example.com',
      MembershipRole.ADMIN,
    );
    const vehicle = await actor
      .post('/vehicles')
      .send({
        brand: 'Honda',
        model: 'Civic',
        registrationNumber: 'INVAL01',
        technicalInspectionExpiry: '2026-04-13',
      })
      .expect(201);
    const dataSource = app.get(DataSource);
    const deliveries = await dataSource.query(
      `SELECT delivery.id FROM notification_deliveries delivery
       JOIN notification_recipients recipient ON recipient.id = delivery."recipientId"
       JOIN vehicle_deadline_notification_details detail ON detail."notificationId" = recipient."notificationId"
       WHERE detail."vehicleId" = $1 ORDER BY delivery.id`,
      [vehicle.body.id],
    );
    await dataSource.query(
      `UPDATE notification_deliveries SET status = 'SENT', "sentAt" = $1, "completedAt" = $1 WHERE id = $2`,
      [instant, deliveries[0].id],
    );
    await actor
      .patch(`/vehicles/${vehicle.body.id}`)
      .send({ technicalInspectionExpiry: '2026-06-30' })
      .expect(200);
    await app.get(VehicleDeadlineReconciliation).processDue();
    await actor
      .get('/notifications')
      .expect(200)
      .expect(({ body }) => expect(body.items).toEqual([]));
    const states = await dataSource.query(
      `SELECT notification."invalidatedAt", delivery.status, delivery."completedAt"
       FROM notifications notification
       JOIN notification_recipients recipient ON recipient."notificationId" = notification.id
       JOIN notification_deliveries delivery ON delivery."recipientId" = recipient.id
       WHERE delivery.id = ANY($1::uuid[]) ORDER BY delivery.id`,
      [deliveries.map(({ id }: { id: string }) => id)],
    );
    expect(states).toHaveLength(2);
    expect(
      states.every(
        ({ invalidatedAt }: { invalidatedAt: Date }) =>
          invalidatedAt.getTime() === instant.getTime(),
      ),
    ).toBe(true);
    expect(
      states.map(({ status }: { status: string }) => status).sort(),
    ).toEqual(['CANCELLED', 'SENT']);
  });

  it('purges invalid Notifications only after the 90-day boundary with cascades', async () => {
    instant = new Date('2026-03-30T06:00:00.000Z');
    const actor = await owner('notification-reconcile-retention@example.com');
    const vehicle = await actor
      .post('/vehicles')
      .send({
        brand: 'Renault',
        model: 'Clio',
        registrationNumber: 'RETEN01',
        ocExpiry: '2026-04-13',
      })
      .expect(201);
    await actor.delete(`/vehicles/${vehicle.body.id}`).expect(204);
    const processor = app.get(VehicleDeadlineReconciliation);
    const dataSource = app.get(DataSource);
    await processor.processDue();
    instant = new Date('2026-06-28T06:00:00.000Z');
    await processor.processDue();
    expect(
      (
        await dataSource.query(`SELECT count(*)::int count FROM notifications`)
      )[0].count,
    ).toBe(1);
    instant = new Date('2026-06-28T06:00:00.001Z');
    await processor.processDue();
    const [counts] = await dataSource.query(`SELECT
      (SELECT count(*)::int FROM notifications) notifications,
      (SELECT count(*)::int FROM vehicle_deadline_notification_details) details,
      (SELECT count(*)::int FROM notification_recipients) recipients,
      (SELECT count(*)::int FROM notification_deliveries) deliveries`);
    expect(counts).toEqual({
      notifications: 0,
      details: 0,
      recipients: 0,
      deliveries: 0,
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
    await manager.agent
      .get('/notifications')
      .expect(200)
      .expect(({ body }) => expect(body.items).toEqual([]));
  });

  it('marks read and archive idempotently for only the caller Recipient', async () => {
    instant = new Date('2026-03-30T06:00:00.000Z');
    const actor = await owner('notification-personal-state@example.com');
    const admin = await invite(
      actor,
      'notification-personal-state-admin@example.com',
      MembershipRole.ADMIN,
    );
    await actor
      .post('/vehicles')
      .send({
        brand: 'Toyota',
        model: 'Corolla',
        registrationNumber: 'STATE01',
        ocExpiry: '2026-04-13',
      })
      .expect(201);
    const notification = (await actor.get('/notifications').expect(200)).body
      .items[0];
    expect(notification).toMatchObject({ readAt: null, archivedAt: null });

    const firstRead = await actor
      .patch(`/notifications/${notification.id}/read`)
      .expect(200);
    const repeatedRead = await actor
      .patch(`/notifications/${notification.id}/read`)
      .expect(200);
    expect(firstRead.body).toMatchObject({
      id: notification.id,
      readAt: instant.toISOString(),
      archivedAt: null,
    });
    expect(repeatedRead.body.readAt).toBe(firstRead.body.readAt);

    const firstArchive = await actor
      .patch(`/notifications/${notification.id}/archive`)
      .expect(200);
    const repeatedArchive = await actor
      .patch(`/notifications/${notification.id}/archive`)
      .expect(200);
    expect(firstArchive.body).toMatchObject({
      id: notification.id,
      readAt: instant.toISOString(),
      archivedAt: instant.toISOString(),
    });
    expect(repeatedArchive.body.archivedAt).toBe(firstArchive.body.archivedAt);

    await actor
      .get('/notifications')
      .expect(200)
      .expect(({ body }) => expect(body.items).toEqual([]));
    await actor
      .get('/notifications')
      .query({ archived: true })
      .expect(200)
      .expect(({ body }) => {
        expect(body.items).toHaveLength(1);
        expect(body.items[0]).toMatchObject({
          id: notification.id,
          readAt: instant.toISOString(),
          archivedAt: instant.toISOString(),
        });
      });
    await admin.agent
      .get(`/notifications/${notification.id}`)
      .expect(200)
      .expect(({ body }) =>
        expect(body).toMatchObject({ readAt: null, archivedAt: null }),
      );
  });

  it('marks all only currently valid visible unarchived caller items, optionally by category', async () => {
    instant = new Date('2026-03-30T06:00:00.000Z');
    const actor = await owner('notification-read-all@example.com');
    const admin = await invite(
      actor,
      'notification-read-all-admin@example.com',
      MembershipRole.ADMIN,
    );
    const dataSource = app.get(DataSource);
    for (const registrationNumber of [
      'READA01',
      'READA02',
      'READA03',
      'READA04',
    ]) {
      await actor
        .post('/vehicles')
        .send({
          brand: 'Ford',
          model: 'Focus',
          registrationNumber,
          ocExpiry: '2026-04-13',
        })
        .expect(201);
    }
    const items = (await actor.get('/notifications').query({ limit: 100 })).body
      .items as Array<{ id: string; vehicle: { registrationNumber: string } }>;
    const archived = items.find(
      ({ vehicle }) => vehicle.registrationNumber === 'READA03',
    )!;
    const invalid = items.find(
      ({ vehicle }) => vehicle.registrationNumber === 'READA04',
    )!;
    await actor.patch(`/notifications/${archived.id}/archive`).expect(200);
    await dataSource.query(
      `UPDATE notifications SET "invalidatedAt" = $2 WHERE id = $1`,
      [invalid.id, instant],
    );

    await actor
      .post('/notifications/read-all')
      .send({ category: 'SERVICE' })
      .expect(200, { updatedCount: 0 });
    await actor
      .post('/notifications/read-all')
      .send({ category: 'FLEET_DEADLINES' })
      .expect(200, { updatedCount: 2 });
    await actor
      .post('/notifications/read-all')
      .send({ category: 'FLEET_DEADLINES' })
      .expect(200, { updatedCount: 0 });

    await actor
      .get('/notifications')
      .query({ unread: true })
      .expect(200)
      .expect(({ body }) => expect(body.items).toEqual([]));
    await admin.agent
      .get('/notifications')
      .query({ unread: true, limit: 100 })
      .expect(200)
      .expect(({ body }) => expect(body.items).toHaveLength(3));
    const [invalidRecipient] = await dataSource.query<
      Array<{ readAt: Date | null }>
    >(
      `SELECT recipient."readAt"
       FROM notification_recipients recipient
       JOIN memberships membership ON membership.id = recipient."membershipId"
       WHERE recipient."notificationId" = $1 AND membership."userId" = (
         SELECT users.id FROM users WHERE users.email = $2
       )`,
      [invalid.id, 'notification-read-all@example.com'],
    );
    expect(invalidRecipient.readAt).toBeNull();
  });

  it('masks detail and personal mutations after source invalidation or current access loss', async () => {
    const actor = await owner('notification-mask-state@example.com');
    const manager = await invite(
      actor,
      'notification-mask-state-manager@example.com',
      MembershipRole.MANAGER,
    );
    const vehicle = await actor
      .post('/vehicles')
      .send({
        brand: 'Volvo',
        model: 'XC60',
        registrationNumber: 'MASK001',
        ocExpiry: '2026-04-13',
      })
      .expect(201);
    await actor
      .post(`/vehicles/${vehicle.body.id}/managers`)
      .send({ managerId: manager.userId })
      .expect(201);
    const notification = (await manager.agent.get('/notifications')).body
      .items[0];

    await actor
      .delete(`/vehicles/${vehicle.body.id}/managers/${manager.userId}`)
      .expect(204);
    await manager.agent.get(`/notifications/${notification.id}`).expect(404);
    await manager.agent
      .patch(`/notifications/${notification.id}/read`)
      .expect(404);
    await manager.agent
      .patch(`/notifications/${notification.id}/archive`)
      .expect(404);

    await actor
      .patch(`/vehicles/${vehicle.body.id}`)
      .send({ ocExpiry: '2026-04-12' })
      .expect(200);
    await actor.get(`/notifications/${notification.id}`).expect(404);
    await actor.patch(`/notifications/${notification.id}/read`).expect(404);
    await actor.patch(`/notifications/${notification.id}/archive`).expect(404);
  });

  it('serializes a personal mutation behind concurrent source invalidation', async () => {
    instant = new Date('2026-03-30T06:00:00.000Z');
    const actor = await owner('notification-mutation-race@example.com');
    await actor
      .post('/vehicles')
      .send({
        brand: 'Volvo',
        model: 'V60',
        registrationNumber: 'RACE001',
        ocExpiry: '2026-04-13',
      })
      .expect(201);
    const notification = (await actor.get('/notifications')).body.items[0];
    const dataSource = app.get(DataSource);
    const invalidation = dataSource.createQueryRunner();
    await invalidation.connect();
    await invalidation.startTransaction();
    let mutationSettled = false;
    try {
      await invalidation.query(
        `UPDATE notifications SET "invalidatedAt" = $2 WHERE id = $1`,
        [notification.id, instant],
      );
      const mutation = actor
        .patch(`/notifications/${notification.id}/read`)
        .then((response) => {
          mutationSettled = true;
          return response;
        });
      await new Promise((resolve) => setTimeout(resolve, 50));
      expect(mutationSettled).toBe(false);
      await invalidation.commitTransaction();
      expect((await mutation).status).toBe(404);
    } finally {
      if (invalidation.isTransactionActive) {
        await invalidation.rollbackTransaction();
      }
      await invalidation.release();
    }
    const [recipient] = await dataSource.query<Array<{ readAt: Date | null }>>(
      `SELECT "readAt" FROM notification_recipients WHERE "notificationId" = $1`,
      [notification.id],
    );
    expect(recipient.readAt).toBeNull();
  });

  it('serializes a personal mutation behind concurrent Vehicle Access revocation', async () => {
    instant = new Date('2026-03-30T06:00:00.000Z');
    const actor = await owner('notification-access-race@example.com');
    const manager = await invite(
      actor,
      'notification-access-race-manager@example.com',
      MembershipRole.MANAGER,
    );
    const vehicle = await actor
      .post('/vehicles')
      .send({
        brand: 'Volvo',
        model: 'XC40',
        registrationNumber: 'RACE002',
        ocExpiry: '2026-04-13',
      })
      .expect(201);
    await actor
      .post(`/vehicles/${vehicle.body.id}/managers`)
      .send({ managerId: manager.userId })
      .expect(201);
    const notification = (await manager.agent.get('/notifications')).body
      .items[0];
    const dataSource = app.get(DataSource);
    const revocation = dataSource.createQueryRunner();
    await revocation.connect();
    await revocation.startTransaction();
    const revokedAt = new Date(Date.now() + 1_000);
    let mutationSettled = false;
    try {
      await revocation.query(
        `UPDATE manager_vehicle_assignments
            SET "assignedTo" = $3
          WHERE "vehicleId" = $1 AND "managerId" = $2
            AND "assignedTo" IS NULL`,
        [vehicle.body.id, manager.userId, revokedAt],
      );
      const mutation = manager.agent
        .patch(`/notifications/${notification.id}/read`)
        .then((response) => {
          mutationSettled = true;
          return response;
        });
      await new Promise((resolve) => setTimeout(resolve, 50));
      expect(mutationSettled).toBe(false);
      await revocation.query(
        `UPDATE notification_recipients
            SET "revokedAt" = $2
          WHERE "notificationId" = $1 AND "revokedAt" IS NULL`,
        [notification.id, revokedAt],
      );
      await revocation.commitTransaction();
      expect((await mutation).status).toBe(404);
    } finally {
      if (revocation.isTransactionActive) {
        await revocation.rollbackTransaction();
      }
      await revocation.release();
    }
    const [recipient] = await dataSource.query<
      Array<{ readAt: Date | null; revokedAt: Date | null }>
    >(
      `SELECT recipient."readAt", recipient."revokedAt"
         FROM notification_recipients recipient
         JOIN memberships membership ON membership.id = recipient."membershipId"
        WHERE recipient."notificationId" = $1 AND membership."userId" = $2`,
      [notification.id, manager.userId],
    );
    expect(recipient.readAt).toBeNull();
    expect(recipient.revokedAt).toEqual(revokedAt);
  });

  it('counts active Alerts independently from currently visible unread Notifications', async () => {
    const actor = await owner('notification-summary@example.com');
    const manager = await invite(
      actor,
      'notification-summary-manager@example.com',
      MembershipRole.MANAGER,
    );
    const first = await actor
      .post('/vehicles')
      .send({
        brand: 'Audi',
        model: 'A4',
        registrationNumber: 'SUM001',
        ocExpiry: '2026-04-13',
      })
      .expect(201);
    const second = await actor
      .post('/vehicles')
      .send({
        brand: 'Audi',
        model: 'A6',
        registrationNumber: 'SUM002',
        ocExpiry: '2026-04-13',
      })
      .expect(201);
    for (const vehicleId of [first.body.id, second.body.id]) {
      await actor
        .post(`/vehicles/${vehicleId}/managers`)
        .send({ managerId: manager.userId })
        .expect(201);
    }
    await actor
      .get('/notification-center/summary')
      .expect(200, { activeAlertCount: 2, unreadNotificationCount: 2 });
    await manager.agent
      .get('/notification-center/summary')
      .expect(200, { activeAlertCount: 2, unreadNotificationCount: 2 });

    const ownerItems = (await actor.get('/notifications').query({ limit: 100 }))
      .body.items as Array<{ id: string; vehicleId: string }>;
    await actor.patch(`/notifications/${ownerItems[0].id}/archive`).expect(200);
    await app
      .get(DataSource)
      .query(`UPDATE notifications SET "invalidatedAt" = $2 WHERE id = $1`, [
        ownerItems[1].id,
        instant,
      ]);
    await actor
      .get('/notification-center/summary')
      .expect(200, { activeAlertCount: 2, unreadNotificationCount: 0 });
    await manager.agent
      .get('/notification-center/summary')
      .expect(200, { activeAlertCount: 2, unreadNotificationCount: 1 });

    for (const vehicleId of [first.body.id, second.body.id]) {
      await actor
        .delete(`/vehicles/${vehicleId}/managers/${manager.userId}`)
        .expect(204);
    }
    await manager.agent
      .get('/notification-center/summary')
      .expect(200, { activeAlertCount: 0, unreadNotificationCount: 0 });
  });

  it('protects every inbox mutation with the allowed Origin policy', async () => {
    const allowedOrigin = 'https://app.example.com';
    const strictApp = (await createTestApp({
      clock: { now: () => new Date(instant) },
      frontendOrigins: {
        corsOrigins: [allowedOrigin],
        allowsMutation: (origin) => origin === allowedOrigin,
        resolveLinkBase: () => allowedOrigin,
      },
    })) as INestApplication<App>;
    try {
      await createVerifiedUser(
        strictApp,
        'notification-origin@example.com',
        'Password123!',
      );
      const strictActor = request.agent(strictApp.getHttpServer());
      await strictActor
        .post('/auth/signin')
        .send({
          email: 'notification-origin@example.com',
          password: 'Password123!',
        })
        .expect(201);
      await strictActor
        .post('/vehicles')
        .set('Origin', allowedOrigin)
        .send({
          brand: 'Toyota',
          model: 'Yaris',
          registrationNumber: 'ORIGIN1',
          ocExpiry: '2026-04-13',
        })
        .expect(201);
      const notification = (await strictActor.get('/notifications')).body
        .items[0];

      for (const path of [
        `/notifications/${notification.id}/read`,
        `/notifications/${notification.id}/archive`,
        '/notifications/read-all',
      ]) {
        const method = path.endsWith('read-all') ? 'post' : 'patch';
        await strictActor[method](path).expect(403);
        await strictActor[method](path)
          .set('Origin', 'https://evil.example.com')
          .expect(403);
        await strictActor[method](path)
          .set('Origin', allowedOrigin)
          .expect(200);
      }
    } finally {
      await strictApp.close();
    }
  });

  it('adds a newly authorized Manager only to the current stage and follows current preferences', async () => {
    instant = new Date('2026-03-30T06:00:00.000Z');
    const actor = await owner('notification-access-gain@example.com');
    const vehicle = await actor
      .post('/vehicles')
      .send({
        brand: 'Toyota',
        model: 'Yaris',
        registrationNumber: 'GAIN001',
        ocExpiry: '2026-04-29',
      })
      .expect(201);
    const manager = await invite(
      actor,
      'notification-access-gain-manager@example.com',
      MembershipRole.MANAGER,
    );
    await manager.agent
      .patch('/notification-preferences/me')
      .send({
        preferences: [
          {
            category: 'FLEET_DEADLINES',
            emailMode: 'OFF',
            showLiveToasts: true,
          },
        ],
      })
      .expect(200);

    instant = new Date('2026-04-15T06:00:00.000Z');
    await app.get(VehicleDeadlineReconciliation).processDue();
    await actor
      .post(`/vehicles/${vehicle.body.id}/managers`)
      .send({ managerId: manager.userId })
      .expect(201);

    await manager.agent
      .get('/notifications')
      .expect(200)
      .expect(({ body }) => {
        expect(body.items).toHaveLength(1);
        expect(body.items[0]).toMatchObject({
          vehicleId: vehicle.body.id,
          leadDay: 14,
        });
      });
    const rows = await app.get(DataSource).query(
      `SELECT detail."leadDay", count(delivery.id)::int deliveries
       FROM notification_recipients recipient
       JOIN memberships membership ON membership.id = recipient."membershipId"
       JOIN vehicle_deadline_notification_details detail ON detail."notificationId" = recipient."notificationId"
       LEFT JOIN notification_deliveries delivery ON delivery."recipientId" = recipient.id
       WHERE membership."userId" = $1 AND detail."vehicleId" = $2
       GROUP BY detail."leadDay"`,
      [manager.userId, vehicle.body.id],
    );
    expect(rows).toEqual([{ leadDay: 14, deliveries: 0 }]);
  });

  it('keeps the previously reached stage current before 08:00 on the next threshold date', async () => {
    instant = new Date('2026-03-30T06:00:00.000Z');
    const actor = await owner('notification-before-eight-access@example.com');
    const manager = await invite(
      actor,
      'notification-before-eight-access-manager@example.com',
      MembershipRole.MANAGER,
    );
    const vehicle = await actor
      .post('/vehicles')
      .send({
        brand: 'Citroen',
        model: 'C5',
        registrationNumber: 'BEFORE8',
        ocExpiry: '2026-04-29',
      })
      .expect(201);
    instant = new Date('2026-04-15T05:59:59.000Z');

    await actor
      .post(`/vehicles/${vehicle.body.id}/managers`)
      .send({ managerId: manager.userId })
      .expect(201);

    await manager.agent
      .get('/notifications')
      .expect(200)
      .expect(({ body }) => {
        expect(body.items).toHaveLength(1);
        expect(body.items[0]).toMatchObject({ leadDay: 30 });
      });
  });

  it('does not add a late due-day recipient on the eighth overdue day before 08:00', async () => {
    instant = new Date('2026-04-01T06:00:00.000Z');
    const actor = await owner('notification-eighth-overdue-day@example.com');
    const manager = await invite(
      actor,
      'notification-eighth-overdue-day-manager@example.com',
      MembershipRole.MANAGER,
    );
    const vehicle = await actor
      .post('/vehicles')
      .send({
        brand: 'Honda',
        model: 'Civic',
        registrationNumber: 'OVERDUE8',
        ocExpiry: '2026-04-01',
      })
      .expect(201);
    instant = new Date('2026-04-09T05:59:59.000Z');

    await actor
      .post(`/vehicles/${vehicle.body.id}/managers`)
      .send({ managerId: manager.userId })
      .expect(201);

    await manager.agent
      .get('/notifications')
      .expect(200)
      .expect(({ body }) => expect(body.items).toEqual([]));
    const rows = await app
      .get(DataSource)
      .query<Array<{ recipients: number; deliveries: number }>>(
        `SELECT count(recipient.id)::int recipients, count(delivery.id)::int deliveries
       FROM notification_recipients recipient
       JOIN memberships membership ON membership.id = recipient."membershipId"
       JOIN vehicle_deadline_notification_details detail ON detail."notificationId" = recipient."notificationId"
       LEFT JOIN notification_deliveries delivery ON delivery."recipientId" = recipient.id
       WHERE membership."userId" = $1 AND detail."vehicleId" = $2`,
        [manager.userId, vehicle.body.id],
      );
    expect(rows).toEqual([{ recipients: 0, deliveries: 0 }]);
  });

  it('keeps the most urgent configured stage current after seven overdue days when due-day is disabled', async () => {
    instant = new Date('2026-03-30T06:00:00.000Z');
    const actor = await owner('notification-no-due-day-stage@example.com');
    await actor
      .patch('/alert-policy')
      .send({ leadDays: [30, 14, 7] })
      .expect(200);
    const manager = await invite(
      actor,
      'notification-no-due-day-stage-manager@example.com',
      MembershipRole.MANAGER,
    );
    const vehicle = await actor
      .post('/vehicles')
      .send({
        brand: 'Mazda',
        model: '3',
        registrationNumber: 'NODUE000',
        ocExpiry: '2026-04-06',
      })
      .expect(201);
    instant = new Date('2026-04-14T05:59:59.000Z');

    await actor
      .post(`/vehicles/${vehicle.body.id}/managers`)
      .send({ managerId: manager.userId })
      .expect(201);

    await manager.agent
      .get('/notifications')
      .expect(200)
      .expect(({ body }) => {
        expect(body.items).toHaveLength(1);
        expect(body.items[0]).toMatchObject({
          vehicleId: vehicle.body.id,
          leadDay: 7,
        });
      });
    const rows = await app
      .get(DataSource)
      .query<Array<{ recipients: number; deliveries: number }>>(
        `SELECT count(recipient.id)::int recipients, count(delivery.id)::int deliveries
       FROM notification_recipients recipient
       JOIN memberships membership ON membership.id = recipient."membershipId"
       JOIN vehicle_deadline_notification_details detail ON detail."notificationId" = recipient."notificationId"
       LEFT JOIN notification_deliveries delivery ON delivery."recipientId" = recipient.id
       WHERE membership."userId" = $1 AND detail."vehicleId" = $2`,
        [manager.userId, vehicle.body.id],
      );
    expect(rows).toEqual([{ recipients: 1, deliveries: 1 }]);
  });

  it('revokes Vehicle recipients and cancels only nonterminal Deliveries when access is removed', async () => {
    instant = new Date('2026-03-30T06:00:00.000Z');
    const actor = await owner('notification-access-loss@example.com');
    const manager = await invite(
      actor,
      'notification-access-loss-manager@example.com',
      MembershipRole.MANAGER,
    );
    const vehicle = await actor
      .post('/vehicles')
      .send({
        brand: 'Ford',
        model: 'Kuga',
        registrationNumber: 'LOSS001',
        ocExpiry: '2026-04-13',
        acExpiry: '2026-04-13',
      })
      .expect(201);
    await actor
      .post(`/vehicles/${vehicle.body.id}/managers`)
      .send({ managerId: manager.userId })
      .expect(201);
    const dataSource = app.get(DataSource);
    const deliveries = await dataSource.query<
      Array<{ id: string; deadlineKind: string }>
    >(
      `SELECT delivery.id, detail."deadlineKind"
       FROM notification_deliveries delivery
       JOIN notification_recipients recipient ON recipient.id = delivery."recipientId"
       JOIN memberships membership ON membership.id = recipient."membershipId"
       JOIN vehicle_deadline_notification_details detail ON detail."notificationId" = recipient."notificationId"
       WHERE membership."userId" = $1 AND detail."vehicleId" = $2
       ORDER BY detail."deadlineKind"`,
      [manager.userId, vehicle.body.id],
    );
    await dataSource.query(
      `UPDATE notification_deliveries
       SET status = 'SENT', "sentAt" = $1, "completedAt" = $1
       WHERE id = $2`,
      [instant, deliveries[0].id],
    );

    await actor
      .delete(`/vehicles/${vehicle.body.id}/managers/${manager.userId}`)
      .expect(204);

    await manager.agent
      .get('/notifications')
      .expect(200)
      .expect(({ body }) => expect(body.items).toEqual([]));
    const states = await dataSource.query<
      Array<{
        deadlineKind: string;
        revokedAt: Date | null;
        status: string;
        completedAt: Date | null;
      }>
    >(
      `SELECT detail."deadlineKind", recipient."revokedAt", delivery.status, delivery."completedAt"
       FROM notification_recipients recipient
       JOIN memberships membership ON membership.id = recipient."membershipId"
       JOIN vehicle_deadline_notification_details detail ON detail."notificationId" = recipient."notificationId"
       JOIN notification_deliveries delivery ON delivery."recipientId" = recipient.id
       WHERE membership."userId" = $1 AND detail."vehicleId" = $2
       ORDER BY detail."deadlineKind"`,
      [manager.userId, vehicle.body.id],
    );
    expect(
      states.every(
        ({ revokedAt }) => revokedAt?.getTime() === instant.getTime(),
      ),
    ).toBe(true);
    expect(states.map(({ status }) => status).sort()).toEqual([
      'CANCELLED',
      'SENT',
    ]);
    expect(states.find(({ status }) => status === 'SENT')?.completedAt).toEqual(
      instant,
    );
  });

  it('adds a newly authorized Admin only to the current stage', async () => {
    instant = new Date('2026-03-30T06:00:00.000Z');
    const actor = await owner('notification-new-admin@example.com');
    const vehicle = await actor
      .post('/vehicles')
      .send({
        brand: 'Nissan',
        model: 'Qashqai',
        registrationNumber: 'ADMIN01',
        technicalInspectionExpiry: '2026-04-29',
      })
      .expect(201);
    instant = new Date('2026-04-15T06:00:00.000Z');
    await app.get(VehicleDeadlineReconciliation).processDue();

    const admin = await invite(
      actor,
      'notification-new-admin-member@example.com',
      MembershipRole.ADMIN,
    );

    await admin.agent
      .get('/notifications')
      .expect(200)
      .expect(({ body }) => {
        expect(body.items).toHaveLength(1);
        expect(body.items[0]).toMatchObject({
          vehicleId: vehicle.body.id,
          leadDay: 14,
        });
      });
  });

  it('adds a newly activated cross-Workspace Membership without leaking history', async () => {
    instant = new Date('2026-03-30T06:00:00.000Z');
    const actor = await owner('notification-activation-owner@example.com');
    const target = await owner('notification-activation-target@example.com');
    const targetContext = await target.get('/auth/me').expect(200);
    const vehicle = await actor
      .post('/vehicles')
      .send({
        brand: 'Peugeot',
        model: '308',
        registrationNumber: 'ACTIVE1',
        ocExpiry: '2026-04-29',
      })
      .expect(201);
    instant = new Date('2026-04-15T06:00:00.000Z');
    await app.get(VehicleDeadlineReconciliation).processDue();
    const actorContext = await actor.get('/auth/me').expect(200);
    const events = captureEmittedEvents(app);
    try {
      await actor
        .post('/users/invitations')
        .send({
          email: 'notification-activation-target@example.com',
          role: MembershipRole.ADMIN,
        })
        .expect(201);
      await target
        .post('/auth/invitations/accept')
        .send({ token: events.membershipInvitationToken })
        .expect(204);
    } finally {
      events.restore();
    }

    await target
      .post('/auth/switch-company')
      .send({ companyId: actorContext.body.companyId })
      .expect(204);
    await target
      .get('/notifications')
      .expect(200)
      .expect(({ body }) => {
        expect(body.items).toHaveLength(1);
        expect(body.items[0]).toMatchObject({
          vehicleId: vehicle.body.id,
          leadDay: 14,
        });
      });
    await target
      .post('/auth/switch-company')
      .send({ companyId: targetContext.body.companyId })
      .expect(204);
    await target
      .get('/notifications')
      .expect(200)
      .expect(({ body }) => expect(body.items).toEqual([]));
  });

  it('adds a Membership activated by first-password completion to the current stage', async () => {
    instant = new Date('2026-03-30T06:00:00.000Z');
    const actor = await owner('notification-first-password-owner@example.com');
    const vehicle = await actor
      .post('/vehicles')
      .send({
        brand: 'Dacia',
        model: 'Duster',
        registrationNumber: 'FIRSTPW',
        ocExpiry: '2026-04-29',
      })
      .expect(201);
    instant = new Date('2026-04-15T06:00:00.000Z');
    await app.get(VehicleDeadlineReconciliation).processDue();
    const events = captureEmittedEvents(app);
    try {
      await actor
        .post('/users/invitations')
        .send({
          email: 'notification-first-password-admin@example.com',
          role: MembershipRole.ADMIN,
        })
        .expect(201);
      await request(app.getHttpServer())
        .post('/auth/reset-password')
        .send({
          token: events.passwordResetToken,
          password: 'First-password1!',
        })
        .expect(204);
    } finally {
      events.restore();
    }
    const admin = request.agent(app.getHttpServer());
    await admin
      .post('/auth/signin')
      .send({
        email: 'notification-first-password-admin@example.com',
        password: 'First-password1!',
      })
      .expect(201);
    await admin
      .get('/notifications')
      .expect(200)
      .expect(({ body }) => {
        expect(body.items).toHaveLength(1);
        expect(body.items[0]).toMatchObject({
          vehicleId: vehicle.body.id,
          leadDay: 14,
        });
      });
  });

  it('revokes only the Manager who loses access when two Managers are recipients', async () => {
    instant = new Date('2026-03-30T06:00:00.000Z');
    const actor = await owner('notification-two-managers@example.com');
    const first = await invite(
      actor,
      'notification-two-managers-first@example.com',
      MembershipRole.MANAGER,
    );
    const second = await invite(
      actor,
      'notification-two-managers-second@example.com',
      MembershipRole.MANAGER,
    );
    const vehicle = await actor
      .post('/vehicles')
      .send({
        brand: 'Volkswagen',
        model: 'Passat',
        registrationNumber: 'TWOMGR1',
        ocExpiry: '2026-04-13',
      })
      .expect(201);
    for (const managerId of [first.userId, second.userId]) {
      await actor
        .post(`/vehicles/${vehicle.body.id}/managers`)
        .send({ managerId })
        .expect(201);
    }
    await actor
      .delete(`/vehicles/${vehicle.body.id}/managers/${first.userId}`)
      .expect(204);

    await first.agent
      .get('/notifications')
      .expect(200)
      .expect(({ body }) => expect(body.items).toEqual([]));
    await second.agent
      .get('/notifications')
      .expect(200)
      .expect(({ body }) => expect(body.items).toHaveLength(1));
    const rows = await app
      .get(DataSource)
      .query<Array<{ userId: string; revokedAt: Date | null }>>(
        `SELECT membership."userId", recipient."revokedAt"
       FROM notification_recipients recipient
       JOIN memberships membership ON membership.id = recipient."membershipId"
       JOIN vehicle_deadline_notification_details detail ON detail."notificationId" = recipient."notificationId"
       WHERE detail."vehicleId" = $1 AND membership."userId" = ANY($2::uuid[])
       ORDER BY membership."userId"`,
        [vehicle.body.id, [first.userId, second.userId]],
      );
    expect(
      rows.find(({ userId }) => userId === first.userId)?.revokedAt,
    ).toEqual(instant);
    expect(
      rows.find(({ userId }) => userId === second.userId)?.revokedAt,
    ).toBeNull();
  });

  it('repairs missed Vehicle Access recipient hooks during periodic reconciliation', async () => {
    instant = new Date('2026-03-30T06:00:00.000Z');
    const actor = await owner('notification-repair@example.com');
    const manager = await invite(
      actor,
      'notification-repair-manager@example.com',
      MembershipRole.MANAGER,
    );
    const vehicle = await actor
      .post('/vehicles')
      .send({
        brand: 'Opel',
        model: 'Astra',
        registrationNumber: 'REPAIR1',
        ocExpiry: '2026-04-13',
      })
      .expect(201);
    const dataSource = app.get(DataSource);
    const [{ companyId }] = await dataSource.query<
      Array<{ companyId: string }>
    >(`SELECT "companyId" FROM vehicles WHERE id = $1`, [vehicle.body.id]);
    await dataSource.query(
      `INSERT INTO manager_vehicle_assignments ("companyId", "vehicleId", "managerId")
       VALUES ($1, $2, $3)`,
      [companyId, vehicle.body.id, manager.userId],
    );

    const processor = app.get(VehicleDeadlineReconciliation);
    await processor.processDue();
    await processor.processDue();
    await manager.agent
      .get('/notifications')
      .expect(200)
      .expect(({ body }) => expect(body.items).toHaveLength(1));

    await dataSource.query(
      `UPDATE manager_vehicle_assignments
       SET "assignedTo" = clock_timestamp()
       WHERE "companyId" = $1 AND "vehicleId" = $2 AND "managerId" = $3
         AND "assignedTo" IS NULL`,
      [companyId, vehicle.body.id, manager.userId],
    );
    await manager.agent
      .get('/notifications')
      .expect(200)
      .expect(({ body }) => expect(body.items).toEqual([]));
    const [staleRecipient] = await dataSource.query<
      Array<{ revokedAt: Date | null }>
    >(
      `SELECT recipient."revokedAt"
       FROM notification_recipients recipient
       JOIN memberships membership ON membership.id = recipient."membershipId"
       WHERE membership."userId" = $1`,
      [manager.userId],
    );
    expect(staleRecipient.revokedAt).toBeNull();
    await processor.processDue();
    await processor.processDue();
    await manager.agent
      .get('/notifications')
      .expect(200)
      .expect(({ body }) => expect(body.items).toEqual([]));
    const [state] = await dataSource.query<
      Array<{ revokedAt: Date | null; status: string }>
    >(
      `SELECT recipient."revokedAt", delivery.status
       FROM notification_recipients recipient
       JOIN memberships membership ON membership.id = recipient."membershipId"
       JOIN notification_deliveries delivery ON delivery."recipientId" = recipient.id
       WHERE membership."userId" = $1`,
      [manager.userId],
    );
    expect(state.revokedAt).toEqual(instant);
    expect(state.status).toBe('CANCELLED');
  });

  it('never reactivates a revoked Recipient and adds the Manager only on a later current stage', async () => {
    instant = new Date('2026-03-30T06:00:00.000Z');
    const actor = await owner('notification-regain@example.com');
    const manager = await invite(
      actor,
      'notification-regain-manager@example.com',
      MembershipRole.MANAGER,
    );
    const vehicle = await actor
      .post('/vehicles')
      .send({
        brand: 'Hyundai',
        model: 'i30',
        registrationNumber: 'REGAIN1',
        ocExpiry: '2026-04-13',
      })
      .expect(201);
    await actor
      .post(`/vehicles/${vehicle.body.id}/managers`)
      .send({ managerId: manager.userId })
      .expect(201);
    await actor
      .delete(`/vehicles/${vehicle.body.id}/managers/${manager.userId}`)
      .expect(204);
    await actor
      .post(`/vehicles/${vehicle.body.id}/managers`)
      .send({ managerId: manager.userId })
      .expect(201);
    await manager.agent
      .get('/notifications')
      .expect(200)
      .expect(({ body }) => expect(body.items).toEqual([]));

    instant = new Date('2026-04-06T06:00:00.000Z');
    await app.get(VehicleDeadlineReconciliation).processDue();
    await manager.agent
      .get('/notifications')
      .expect(200)
      .expect(({ body }) => {
        expect(body.items).toHaveLength(1);
        expect(body.items[0]).toMatchObject({ leadDay: 7 });
      });
    const recipients = await app
      .get(DataSource)
      .query<Array<{ leadDay: number; revokedAt: Date | null }>>(
        `SELECT detail."leadDay", recipient."revokedAt"
       FROM notification_recipients recipient
       JOIN memberships membership ON membership.id = recipient."membershipId"
       JOIN vehicle_deadline_notification_details detail ON detail."notificationId" = recipient."notificationId"
       WHERE membership."userId" = $1 AND detail."vehicleId" = $2
       ORDER BY detail."leadDay" DESC`,
        [manager.userId, vehicle.body.id],
      );
    expect(recipients).toHaveLength(2);
    expect(recipients[0].leadDay).toBe(14);
    expect(recipients[0].revokedAt).toEqual(
      new Date('2026-03-30T06:00:00.000Z'),
    );
    expect(recipients[1]).toEqual({ leadDay: 7, revokedAt: null });
  });

  it('expands and reduces recipients when Membership roles change', async () => {
    instant = new Date('2026-03-30T06:00:00.000Z');
    const actor = await owner('notification-role-change@example.com');
    const manager = await invite(
      actor,
      'notification-role-change-manager@example.com',
      MembershipRole.MANAGER,
    );
    const first = await actor
      .post('/vehicles')
      .send({
        brand: 'Seat',
        model: 'Ateca',
        registrationNumber: 'ROLE001',
        ocExpiry: '2026-04-13',
      })
      .expect(201);
    const second = await actor
      .post('/vehicles')
      .send({
        brand: 'Seat',
        model: 'Leon',
        registrationNumber: 'ROLE002',
        ocExpiry: '2026-04-13',
      })
      .expect(201);
    await actor
      .post(`/vehicles/${first.body.id}/managers`)
      .send({ managerId: manager.userId })
      .expect(201);
    expect(
      (await manager.agent.get('/notifications').expect(200)).body.items,
    ).toHaveLength(1);

    await actor
      .patch(`/users/${manager.userId}`)
      .send({ role: MembershipRole.ADMIN })
      .expect(200);
    expect(
      (await manager.agent.get('/notifications').expect(200)).body.items,
    ).toHaveLength(2);
    await actor
      .patch(`/users/${manager.userId}`)
      .send({ role: MembershipRole.MANAGER })
      .expect(200);
    await manager.agent
      .get('/notifications')
      .expect(200)
      .expect(({ body }) => expect(body.items).toEqual([]));

    const rows = await app
      .get(DataSource)
      .query<Array<{ vehicleId: string; revokedAt: Date | null }>>(
        `SELECT detail."vehicleId", recipient."revokedAt"
       FROM notification_recipients recipient
       JOIN memberships membership ON membership.id = recipient."membershipId"
       JOIN vehicle_deadline_notification_details detail ON detail."notificationId" = recipient."notificationId"
       WHERE membership."userId" = $1 ORDER BY detail."vehicleId"`,
        [manager.userId],
      );
    expect(rows.map(({ vehicleId }) => vehicleId).sort()).toEqual(
      [first.body.id, second.body.id].sort(),
    );
    expect(rows.every(({ revokedAt }) => revokedAt !== null)).toBe(true);
  });

  it('revokes a removed Membership and excludes it from future stages', async () => {
    instant = new Date('2026-03-30T06:00:00.000Z');
    const actor = await owner('notification-membership-remove@example.com');
    const admin = await invite(
      actor,
      'notification-membership-remove-admin@example.com',
      MembershipRole.ADMIN,
    );
    const vehicle = await actor
      .post('/vehicles')
      .send({
        brand: 'Skoda',
        model: 'Superb',
        registrationNumber: 'REMOVE1',
        ocExpiry: '2026-04-13',
      })
      .expect(201);
    await actor.delete(`/users/${admin.userId}`).expect(204);

    instant = new Date('2026-04-06T06:00:00.000Z');
    await app.get(VehicleDeadlineReconciliation).processDue();
    const rows = await app
      .get(DataSource)
      .query<
        Array<{ leadDay: number; revokedAt: Date | null; status: string }>
      >(
        `SELECT detail."leadDay", recipient."revokedAt", delivery.status
       FROM notification_recipients recipient
       JOIN memberships membership ON membership.id = recipient."membershipId"
       JOIN vehicle_deadline_notification_details detail ON detail."notificationId" = recipient."notificationId"
       JOIN notification_deliveries delivery ON delivery."recipientId" = recipient.id
       WHERE membership."userId" = $1 AND detail."vehicleId" = $2`,
        [admin.userId, vehicle.body.id],
      );
    expect(rows).toHaveLength(1);
    expect(rows[0].leadDay).toBe(14);
    expect(rows[0].revokedAt).toEqual(new Date('2026-03-30T06:00:00.000Z'));
    expect(rows[0].status).toBe('CANCELLED');
  });

  it('does not grant a Recipient from Driver Allocation alone', async () => {
    instant = new Date('2026-03-30T06:00:00.000Z');
    const actor = await owner('notification-driver-allocation@example.com');
    const manager = await invite(
      actor,
      'notification-driver-allocation-manager@example.com',
      MembershipRole.MANAGER,
    );
    const driver = await actor
      .post('/drivers')
      .send({
        firstName: 'Marek',
        lastName: 'Kierowca',
        userId: manager.userId,
      })
      .expect(201);
    const vehicle = await actor
      .post('/vehicles')
      .send({
        brand: 'Renault',
        model: 'Master',
        registrationNumber: 'DRIVER1',
        ocExpiry: '2026-04-13',
      })
      .expect(201);
    await actor
      .post(`/vehicles/${vehicle.body.id}/drivers`)
      .send({ driverId: driver.body.id })
      .expect(201);
    await app.get(VehicleDeadlineReconciliation).processDue();

    await manager.agent
      .get('/notifications')
      .expect(200)
      .expect(({ body }) => expect(body.items).toEqual([]));
    const [{ count }] = await app
      .get(DataSource)
      .query<Array<{ count: number }>>(
        `SELECT count(*)::int count
       FROM notification_recipients recipient
       JOIN memberships membership ON membership.id = recipient."membershipId"
       WHERE membership."userId" = $1`,
        [manager.userId],
      );
    expect(count).toBe(0);
  });

  it('rolls back Vehicle Access removal when recipient revocation fails', async () => {
    instant = new Date('2026-03-30T06:00:00.000Z');
    const actor = await owner('notification-access-rollback@example.com');
    const manager = await invite(
      actor,
      'notification-access-rollback-manager@example.com',
      MembershipRole.MANAGER,
    );
    const vehicle = await actor
      .post('/vehicles')
      .send({
        brand: 'Fiat',
        model: 'Ducato',
        registrationNumber: 'ROLLACC',
        ocExpiry: '2026-04-13',
      })
      .expect(201);
    await actor
      .post(`/vehicles/${vehicle.body.id}/managers`)
      .send({ managerId: manager.userId })
      .expect(201);
    const dataSource = app.get(DataSource);
    await dataSource.query(
      `ALTER TABLE notification_recipients
       ADD CONSTRAINT "CK_e2e_recipient_revocation_failure" CHECK ("revokedAt" IS NULL)`,
    );
    try {
      await actor
        .delete(`/vehicles/${vehicle.body.id}/managers/${manager.userId}`)
        .expect(500);
    } finally {
      await dataSource.query(
        `ALTER TABLE notification_recipients
         DROP CONSTRAINT "CK_e2e_recipient_revocation_failure"`,
      );
    }
    const [state] = await dataSource.query<
      Array<{ assignedTo: Date | null; revokedAt: Date | null; status: string }>
    >(
      `SELECT assignment."assignedTo", recipient."revokedAt", delivery.status
       FROM manager_vehicle_assignments assignment
       JOIN memberships membership
         ON membership."companyId" = assignment."companyId" AND membership."userId" = assignment."managerId"
       JOIN notification_recipients recipient
         ON recipient."companyId" = membership."companyId" AND recipient."membershipId" = membership.id
       JOIN notification_deliveries delivery ON delivery."recipientId" = recipient.id
       WHERE assignment."vehicleId" = $1 AND assignment."managerId" = $2`,
      [vehicle.body.id, manager.userId],
    );
    expect(state).toEqual({
      assignedTo: null,
      revokedAt: null,
      status: 'PENDING',
    });
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
    await actor
      .get('/notifications')
      .expect(200)
      .expect(({ body }) => expect(body.items).toEqual([]));
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
    const log = jest.spyOn(Logger.prototype, 'log').mockImplementation();
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
    expect(
      log.mock.calls.some(([entry]) =>
        String(entry).includes('notification_generated'),
      ),
    ).toBe(false);
    log.mockRestore();
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
    await second
      .get('/notifications')
      .expect(200)
      .expect(({ body }) => expect(body.items).toEqual([]));
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
        'FK_notification_recipient_membership', 'FK_notification_delivery_recipient',
        'CHK_notification_delivery_attempts')`);
    expect(constraints).toHaveLength(7);
    const [{ dueIndex, updatedAt }] = await dataSource.query<
      Array<{ dueIndex: string | null; updatedAt: boolean }>
    >(
      `SELECT to_regclass('"IDX_notification_deliveries_due"')::text AS "dueIndex",
              EXISTS (
                SELECT 1 FROM information_schema.columns
                 WHERE table_schema = current_schema()
                   AND table_name = 'notification_deliveries'
                   AND column_name = 'updatedAt'
              ) AS "updatedAt"`,
    );
    expect(dueIndex).toBe('"IDX_notification_deliveries_due"');
    expect(updatedAt).toBe(true);
    await dataSource.undoLastMigration();
    expect(
      (
        await dataSource.query(`SELECT to_regclass('notifications') AS table`)
      )[0].table,
    ).toBe('notifications');
    await dataSource.undoLastMigration();
    expect(
      (
        await dataSource.query(`SELECT to_regclass('notifications') AS table`)
      )[0].table,
    ).toBe('notifications');
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
