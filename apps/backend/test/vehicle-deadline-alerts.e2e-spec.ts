import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { createTestApp } from './helpers/create-test-app';
import {
  captureEmittedEvents,
  createVerifiedUser,
} from './helpers/auth-test-utils';
import { MembershipRole } from '../src/users/membership-role';
import { SwaggerModule } from '@nestjs/swagger';
import { createSwaggerConfig } from '../src/swagger-document';
import { DataSource } from 'typeorm';
import type { Logger } from 'typeorm';

describe('Vehicle Deadline Alerts (e2e)', () => {
  let app: INestApplication<App>;
  let currentInstant = new Date('2026-03-29T22:30:00.000Z');

  beforeAll(async () => {
    app = (await createTestApp({
      clock: { now: () => new Date(currentInstant) },
    })) as INestApplication<App>;
  });

  beforeEach(() => {
    currentInstant = new Date('2026-03-29T22:30:00.000Z');
  });

  afterAll(async () => app.close());

  async function signedIn(email: string, password = 'Password123!') {
    await createVerifiedUser(app, email, password);
    const agent = request.agent(app.getHttpServer());
    await agent.post('/auth/signin').send({ email, password }).expect(201);
    return agent;
  }

  async function invite(
    owner: ReturnType<typeof request.agent>,
    email: string,
    role: MembershipRole,
  ) {
    const events = captureEmittedEvents(app);
    try {
      const response = await owner
        .post('/users')
        .send({ email, role })
        .expect(201);
      if (!events.passwordResetToken) throw new Error('Expected invite token');
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

  async function createVehicle(
    owner: ReturnType<typeof request.agent>,
    registrationNumber: string,
    deadlines: {
      ocExpiry?: string;
      acExpiry?: string;
      technicalInspectionExpiry?: string;
    },
  ): Promise<string> {
    const response = await owner
      .post('/vehicles')
      .send({
        brand: 'Toyota',
        model: 'Corolla',
        registrationNumber,
        ...deadlines,
      })
      .expect(201);
    return response.body.id as string;
  }

  async function countQueries(
    actor: ReturnType<typeof request.agent>,
  ): Promise<number> {
    const dataSource = app.get(DataSource);
    const original = dataSource.logger;
    let count = 0;
    const logger: Logger = {
      logQuery(query, parameters, queryRunner) {
        count += 1;
        original.logQuery(query, parameters, queryRunner);
      },
      logQueryError: (...args) => original.logQueryError(...args),
      logQuerySlow: (...args) => original.logQuerySlow(...args),
      logSchemaBuild: (...args) => original.logSchemaBuild(...args),
      logMigration: (...args) => original.logMigration(...args),
      log: (...args) => original.log(...args),
    };
    dataSource.logger = logger;
    try {
      await actor
        .get('/vehicle-deadline-alerts')
        .query({ limit: 100 })
        .expect(200);
      return count;
    } finally {
      dataSource.logger = original;
    }
  }

  it('projects all enabled deadline kinds from Workspace calendar dates and counts them separately', async () => {
    const owner = await signedIn('alert-projection-owner@example.com');
    const ocVehicleId = await createVehicle(owner, 'DST001', {
      ocExpiry: '2026-04-29',
    });
    const acVehicleId = await createVehicle(owner, 'DST002', {
      acExpiry: '2026-03-30',
    });
    const inspectionVehicleId = await createVehicle(owner, 'DST003', {
      technicalInspectionExpiry: '2020-01-01',
    });
    await createVehicle(owner, 'DST004', { ocExpiry: '2026-04-30' });

    const response = await owner.get('/vehicle-deadline-alerts').expect(200);

    expect(response.body).toEqual({
      items: [
        expect.objectContaining({
          alertKey: expect.any(String),
          vehicleId: inspectionVehicleId,
          vehicle: {
            brand: 'Toyota',
            model: 'Corolla',
            registrationNumber: 'DST003',
          },
          deadlineKind: 'TECHNICAL_INSPECTION',
          deadlineDate: '2020-01-01',
          daysRemaining: -2280,
          overdue: true,
        }),
        expect.objectContaining({
          alertKey: expect.any(String),
          vehicleId: acVehicleId,
          deadlineKind: 'AC',
          deadlineDate: '2026-03-30',
          daysRemaining: 0,
          overdue: false,
        }),
        expect.objectContaining({
          alertKey: expect.any(String),
          vehicleId: ocVehicleId,
          deadlineKind: 'OC',
          deadlineDate: '2026-04-29',
          daysRemaining: 30,
          overdue: false,
        }),
      ],
      nextCursor: null,
    });
    expect(
      new Set(
        response.body.items.map((item: { alertKey: string }) => item.alertKey),
      ).size,
    ).toBe(3);

    const repeated = await owner.get('/vehicle-deadline-alerts').expect(200);
    expect(
      repeated.body.items.map((item: { alertKey: string }) => item.alertKey),
    ).toEqual(
      response.body.items.map((item: { alertKey: string }) => item.alertKey),
    );
    const oldOcKey = response.body.items.find(
      (item: { vehicleId: string }) => item.vehicleId === ocVehicleId,
    ).alertKey;
    await owner
      .patch(`/vehicles/${ocVehicleId}`)
      .send({ ocExpiry: '2026-04-28' })
      .expect(200);
    const renewed = await owner.get('/vehicle-deadline-alerts').expect(200);
    expect(
      renewed.body.items.find(
        (item: { vehicleId: string }) => item.vehicleId === ocVehicleId,
      ).alertKey,
    ).not.toBe(oldOcKey);

    await owner
      .get('/notification-center/summary')
      .expect(200)
      .expect({ activeAlertCount: 3, unreadNotificationCount: 0 });
  });

  it('does not persist a Vehicle Deadline Alert table or rows', async () => {
    const tables = (await app.get(DataSource).query(
      `SELECT table_name FROM information_schema.tables
       WHERE table_schema = current_schema()
         AND table_name IN ('vehicle_deadline_alerts', 'deadline_alerts')`,
    )) as Array<{ table_name: string }>;
    expect(tables).toEqual([]);
  });

  it('changes calendar days at Workspace-local midnight on a DST transition date', async () => {
    currentInstant = new Date('2026-03-29T21:59:00.000Z');
    const owner = await signedIn('alert-midnight@example.com');
    await createVehicle(owner, 'CLOCK01', { ocExpiry: '2026-03-29' });

    await owner
      .get('/vehicle-deadline-alerts')
      .expect(200)
      .expect(({ body }) =>
        expect(body.items[0]).toMatchObject({
          daysRemaining: 0,
          overdue: false,
        }),
      );
    currentInstant = new Date('2026-03-29T22:00:00.000Z');
    await owner
      .get('/vehicle-deadline-alerts')
      .expect(200)
      .expect(({ body }) =>
        expect(body.items[0]).toMatchObject({
          daysRemaining: -1,
          overdue: true,
        }),
      );
  });

  it('reflects enabled kinds and the largest lead day immediately without changing Vehicle data', async () => {
    const owner = await signedIn('alert-policy-live@example.com');
    const vehicleId = await createVehicle(owner, 'LIVE001', {
      ocExpiry: '2026-04-29',
      acExpiry: '2026-05-29',
    });

    await owner
      .get('/vehicle-deadline-alerts')
      .expect(200)
      .expect(({ body }) =>
        expect(
          body.items.map((item: { deadlineKind: string }) => item.deadlineKind),
        ).toEqual(['OC']),
      );
    await owner
      .patch('/alert-policy')
      .send({ leadDays: [60] })
      .expect(200);
    await owner
      .get('/vehicle-deadline-alerts')
      .expect(200)
      .expect(({ body }) => expect(body.items).toHaveLength(2));
    await owner
      .patch('/alert-policy')
      .send({ enabledDeadlineKinds: ['AC'] })
      .expect(200);
    await owner
      .get('/vehicle-deadline-alerts')
      .expect(200)
      .expect(({ body }) => {
        expect(body.items).toHaveLength(1);
        expect(body.items[0]).toMatchObject({ vehicleId, deadlineKind: 'AC' });
      });
    await owner
      .patch('/alert-policy')
      .send({ leadDays: [30] })
      .expect(200);
    await owner
      .get('/notification-center/summary')
      .expect(200)
      .expect({ activeAlertCount: 0, unreadNotificationCount: 0 });
  });

  it('applies Vehicle Access to MANAGER and ignores Driver Allocation', async () => {
    const owner = await signedIn('alert-access-owner@example.com');
    const manager = await invite(
      owner,
      'alert-access-manager@example.com',
      MembershipRole.MANAGER,
    );
    const visibleId = await createVehicle(owner, 'ACCESS1', {
      ocExpiry: '2026-03-30',
    });
    const hiddenId = await createVehicle(owner, 'ACCESS2', {
      acExpiry: '2026-03-30',
    });
    const driver = await owner
      .post('/drivers')
      .send({ firstName: 'Shared', lastName: 'Driver' })
      .expect(201);
    await owner
      .post(`/vehicles/${hiddenId}/drivers`)
      .send({ driverId: driver.body.id })
      .expect(201);

    await manager.agent
      .get('/vehicle-deadline-alerts')
      .expect(200)
      .expect(({ body }) => expect(body.items).toEqual([]));
    await owner
      .post(`/vehicles/${visibleId}/managers`)
      .send({ managerId: manager.userId })
      .expect(201);
    await manager.agent
      .get('/vehicle-deadline-alerts')
      .expect(200)
      .expect(({ body }) => {
        expect(
          body.items.map((item: { vehicleId: string }) => item.vehicleId),
        ).toEqual([visibleId]);
      });
    await manager.agent
      .get('/notification-center/summary')
      .expect(200)
      .expect({ activeAlertCount: 1, unreadNotificationCount: 0 });
    await owner
      .delete(`/vehicles/${visibleId}/managers/${manager.userId}`)
      .expect(204);
    await manager.agent
      .get('/notification-center/summary')
      .expect(200)
      .expect({ activeAlertCount: 0, unreadNotificationCount: 0 });
  });

  it('lets OWNER and ADMIN see every active Workspace Vehicle and masks foreign Vehicles', async () => {
    const owner = await signedIn('alert-roles-owner@example.com');
    const admin = await invite(
      owner,
      'alert-roles-admin@example.com',
      MembershipRole.ADMIN,
    );
    const ownVehicleId = await createVehicle(owner, 'ROLE001', {
      ocExpiry: '2026-03-30',
    });
    const foreignOwner = await signedIn('alert-foreign-owner@example.com');
    const foreignVehicleId = await createVehicle(foreignOwner, 'ROLE002', {
      ocExpiry: '2026-03-30',
    });

    for (const actor of [owner, admin.agent]) {
      await actor
        .get('/vehicle-deadline-alerts')
        .expect(200)
        .expect(({ body }) => {
          expect(
            body.items.map((item: { vehicleId: string }) => item.vehicleId),
          ).toEqual([ownVehicleId]);
          expect(JSON.stringify(body)).not.toContain(foreignVehicleId);
        });
      await actor
        .get('/vehicle-deadline-alerts')
        .query({ vehicleId: foreignVehicleId })
        .expect(200)
        .expect(({ body }) => expect(body.items).toEqual([]));
    }
  });

  it('filters by kind, Vehicle and overdue, including combinations', async () => {
    const owner = await signedIn('alert-filters@example.com');
    const firstId = await createVehicle(owner, 'FILTER1', {
      ocExpiry: '2026-03-29',
      acExpiry: '2026-03-30',
    });
    await createVehicle(owner, 'FILTER2', {
      ocExpiry: '2026-03-30',
    });

    await owner
      .get('/vehicle-deadline-alerts')
      .query({ deadlineKind: 'OC', vehicleId: firstId, overdue: true })
      .expect(200)
      .expect(({ body }) => {
        expect(body.items).toHaveLength(1);
        expect(body.items[0]).toMatchObject({
          vehicleId: firstId,
          deadlineKind: 'OC',
          overdue: true,
        });
      });
    await owner
      .get('/vehicle-deadline-alerts')
      .query({ overdue: false })
      .expect(200)
      .expect(({ body }) => expect(body.items).toHaveLength(2));
  });

  it('paginates deterministically with opaque stable cursors and rejects cursor tampering', async () => {
    const owner = await signedIn('alert-pagination@example.com');
    for (let index = 0; index < 5; index += 1) {
      await createVehicle(owner, `PAGE00${index}`, {
        ocExpiry: `2026-04-${String(index + 1).padStart(2, '0')}`,
      });
    }

    const full = await owner
      .get('/vehicle-deadline-alerts')
      .query({ limit: 100 })
      .expect(200);
    const first = await owner
      .get('/vehicle-deadline-alerts')
      .query({ limit: 2 })
      .expect(200);
    const second = await owner
      .get('/vehicle-deadline-alerts')
      .query({ limit: 2, cursor: first.body.nextCursor })
      .expect(200);
    const third = await owner
      .get('/vehicle-deadline-alerts')
      .query({ limit: 2, cursor: second.body.nextCursor })
      .expect(200);
    const combined = [
      ...first.body.items,
      ...second.body.items,
      ...third.body.items,
    ];
    expect(combined.map((item) => item.alertKey)).toEqual(
      full.body.items.map((item: { alertKey: string }) => item.alertKey),
    );
    expect(new Set(combined.map((item) => item.alertKey)).size).toBe(5);
    expect(first.body.nextCursor).not.toContain(first.body.items[1].vehicleId);

    const tampered = `${first.body.nextCursor.slice(0, -1)}x`;
    await owner
      .get('/vehicle-deadline-alerts')
      .query({ cursor: tampered })
      .expect(400);
    await owner
      .get('/vehicle-deadline-alerts')
      .query({ cursor: first.body.nextCursor, overdue: true })
      .expect(400);

    const foreignOwner = await signedIn('alert-cursor-foreign@example.com');
    await createVehicle(foreignOwner, 'CURSOR1', { ocExpiry: '2026-03-30' });
    await createVehicle(foreignOwner, 'CURSOR2', { ocExpiry: '2026-03-30' });
    const foreignPage = await foreignOwner
      .get('/vehicle-deadline-alerts')
      .query({ limit: 1 })
      .expect(200);
    await owner
      .get('/vehicle-deadline-alerts')
      .query({ cursor: foreignPage.body.nextCursor })
      .expect(400);
  });

  it('sorts tied deadlines by Vehicle id and then deadline kind', async () => {
    const owner = await signedIn('alert-order@example.com');
    const firstId = await createVehicle(owner, 'ORDER01', {
      ocExpiry: '2026-03-30',
      acExpiry: '2026-03-30',
    });
    const secondId = await createVehicle(owner, 'ORDER02', {
      ocExpiry: '2026-03-30',
      acExpiry: '2026-03-30',
    });
    const expected = [firstId, secondId]
      .sort()
      .flatMap((vehicleId) => [`${vehicleId}:AC`, `${vehicleId}:OC`]);

    await owner
      .get('/vehicle-deadline-alerts')
      .expect(200)
      .expect(({ body }) => {
        expect(
          body.items.map(
            (item: { vehicleId: string; deadlineKind: string }) =>
              `${item.vehicleId}:${item.deadlineKind}`,
          ),
        ).toEqual(expected);
      });
  });

  it('uses limit 20 by default, accepts 100, and rejects invalid input or tenant identity', async () => {
    const owner = await signedIn('alert-validation@example.com');
    for (let index = 0; index < 21; index += 1) {
      await createVehicle(owner, `LIM${String(index).padStart(3, '0')}`, {
        ocExpiry: '2026-03-30',
      });
    }
    await owner
      .get('/vehicle-deadline-alerts')
      .expect(200)
      .expect(({ body }) => {
        expect(body.items).toHaveLength(20);
        expect(body.nextCursor).toEqual(expect.any(String));
      });
    await owner
      .get('/vehicle-deadline-alerts')
      .query({ limit: 100 })
      .expect(200)
      .expect(({ body }) => expect(body.items).toHaveLength(21));
    for (const query of [
      { limit: 0 },
      { limit: 101 },
      { limit: 'one' },
      { deadlineKind: 'SERVICE' },
      { vehicleId: 'not-a-uuid' },
      { overdue: 'yes' },
      { cursor: 'invalid' },
      { companyId: '00000000-0000-0000-0000-000000000000' },
    ]) {
      await owner.get('/vehicle-deadline-alerts').query(query).expect(400);
    }
  });

  it('uses a bounded query count independent of the number of Vehicles and Alerts', async () => {
    const owner = await signedIn('alert-query-count@example.com');
    await createVehicle(owner, 'QUERY01', { ocExpiry: '2026-03-30' });
    const oneAlertQueries = await countQueries(owner);
    for (let index = 0; index < 20; index += 1) {
      await createVehicle(owner, `QRY${String(index).padStart(3, '0')}`, {
        ocExpiry: '2026-03-30',
        acExpiry: '2026-03-30',
        technicalInspectionExpiry: '2026-03-30',
      });
    }
    const manyAlertQueries = await countQueries(owner);
    expect(manyAlertQueries).toBe(oneAlertQueries);
    expect(manyAlertQueries).toBeLessThanOrEqual(4);
  });

  it('requires authentication and documents the complete Swagger contract', async () => {
    await request(app.getHttpServer())
      .get('/vehicle-deadline-alerts')
      .expect(401);
    await request(app.getHttpServer())
      .get('/notification-center/summary')
      .expect(401);

    const document = SwaggerModule.createDocument(app, createSwaggerConfig());
    const list = document.paths['/vehicle-deadline-alerts'].get;
    const summary = document.paths['/notification-center/summary'].get;
    const schemas = document.components?.schemas ?? {};
    expect(list?.parameters).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: 'deadlineKind', in: 'query' }),
        expect.objectContaining({ name: 'vehicleId', in: 'query' }),
        expect.objectContaining({ name: 'overdue', in: 'query' }),
        expect.objectContaining({ name: 'limit', in: 'query' }),
        expect.objectContaining({ name: 'cursor', in: 'query' }),
      ]),
    );
    expect(list?.responses?.['200']).toBeDefined();
    expect(list?.responses?.['400']).toBeDefined();
    expect(summary?.responses?.['200']).toBeDefined();
    expect(schemas.VehicleDeadlineAlertDto).toMatchObject({
      required: [
        'alertKey',
        'vehicleId',
        'vehicle',
        'deadlineKind',
        'deadlineDate',
        'daysRemaining',
        'overdue',
      ],
    });
    expect(schemas.NotificationCenterSummaryDto).toMatchObject({
      required: ['activeAlertCount', 'unreadNotificationCount'],
    });
    const summarySchema = schemas.NotificationCenterSummaryDto;
    if (!('properties' in summarySchema)) {
      throw new Error('Expected inline summary schema');
    }
    const activeCountSchema = summarySchema.properties?.activeAlertCount;
    if (!activeCountSchema || !('description' in activeCountSchema)) {
      throw new Error('Expected inline active Alert count schema');
    }
    expect(activeCountSchema.description).toContain('Workspace-local date');
    expect(
      list?.parameters?.find(
        (parameter) => 'name' in parameter && parameter.name === 'limit',
      ),
    ).toMatchObject({
      schema: { default: 20, minimum: 1, maximum: 100 },
      description: expect.stringContaining('Defaults to 20'),
    });
    expect(
      list?.parameters?.find(
        (parameter) => 'name' in parameter && parameter.name === 'cursor',
      ),
    ).toMatchObject({
      description: expect.stringContaining('same Active Workspace'),
    });
  });
});
