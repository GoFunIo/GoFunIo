import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { DataSource } from 'typeorm';
import { Service, ServiceType } from '../src/services/services.entity';
import { MembershipRole } from '../src/users/membership-role';
import {
  captureEmittedEvents,
  createVerifiedUser,
} from './helpers/auth-test-utils';
import { createTestApp } from './helpers/create-test-app';

describe('Services (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    app = (await createTestApp()) as INestApplication<App>;
  });

  afterAll(async () => app.close());

  async function signedIn(email: string, password = 'password123') {
    await createVerifiedUser(app, email, password);
    const agent = request.agent(app.getHttpServer());
    await agent.post('/auth/signin').send({ email, password }).expect(201);
    return agent;
  }

  function vehicleBody(registrationNumber: string) {
    return { brand: 'Volvo', model: 'XC60', registrationNumber };
  }

  function service(vehicleId: string, overrides: Record<string, unknown> = {}) {
    return {
      vehicleId,
      serviceDate: '2026-08-01',
      type: ServiceType.OIL_CHANGE,
      cost: 499.99,
      providerName: 'Local Garage',
      notes: 'Oil and filter',
      ...overrides,
    };
  }

  async function inviteManager(
    admin: ReturnType<typeof request.agent>,
    email: string,
  ) {
    const events = captureEmittedEvents(app);
    try {
      const response = await admin
        .post('/users')
        .send({ email, role: MembershipRole.MANAGER })
        .expect(201);
      if (!events.passwordResetToken) throw new Error('Expected invite token');
      await request(app.getHttpServer())
        .post('/auth/reset-password')
        .send({
          token: events.passwordResetToken,
          password: 'manager-password',
        })
        .expect(204);
      const manager = request.agent(app.getHttpServer());
      await manager
        .post('/auth/signin')
        .send({ email, password: 'manager-password' })
        .expect(201);
      return { manager, userId: response.body.id as string };
    } finally {
      events.restore();
    }
  }

  it('creates a Service and lists it for its Vehicle', async () => {
    const agent = await signedIn('services@example.com');
    const vehicle = await agent
      .post('/vehicles')
      .send(vehicleBody('SERV1'))
      .expect(201);

    const created = await agent
      .post('/services')
      .send(service(vehicle.body.id))
      .expect(201);
    await app
      .get(DataSource)
      .getRepository(Service)
      .update(created.body.id, { attachmentKey: 'services/report.pdf' });

    expect(created.body).toMatchObject({
      vehicleId: vehicle.body.id,
      serviceDate: '2026-08-01',
      type: ServiceType.OIL_CHANGE,
      cost: '499.99',
      providerName: 'Local Garage',
      notes: 'Oil and filter',
      vehicle: {
        id: vehicle.body.id,
        brand: 'Volvo',
        model: 'XC60',
        registrationNumber: 'SERV1',
      },
    });
    expect(created.body).not.toHaveProperty('companyId');
    expect(created.body).not.toHaveProperty('attachmentKey');

    await agent
      .get('/services')
      .expect(200)
      .expect(({ body }) => {
        expect(body).toMatchObject({
          total: 1,
          totalCost: '499.99',
          page: 1,
          pageSize: 20,
          totalPages: 1,
        });
        expect(body.items).toEqual([
          expect.objectContaining({
            id: created.body.id,
            vehicleId: vehicle.body.id,
            hasAttachment: true,
          }),
        ]);
      });
    await agent
      .get('/services')
      .query({ vehicleId: vehicle.body.id })
      .expect(200)
      .expect(({ body }) =>
        expect(body.items.map(({ id }: { id: string }) => id)).toEqual([
          created.body.id,
        ]),
      );
  });

  it('filters and paginates Services with totals for the complete result', async () => {
    const agent = await signedIn('service-list@example.com');
    const vehicle = await agent
      .post('/vehicles')
      .send(vehicleBody('LIST1'))
      .expect(201);
    await agent
      .post('/services')
      .send(
        service(vehicle.body.id, {
          serviceDate: '2026-07-01',
          cost: 100,
          providerName: 'First Garage',
        }),
      )
      .expect(201);
    const latest = await agent
      .post('/services')
      .send(
        service(vehicle.body.id, {
          serviceDate: '2026-07-31',
          cost: 250.5,
          providerName: 'Second Garage',
        }),
      )
      .expect(201);
    await agent
      .post('/services')
      .send(
        service(vehicle.body.id, {
          serviceDate: '2026-08-01',
          type: ServiceType.OTHER,
          cost: 999,
          providerName: 'Second Garage',
        }),
      )
      .expect(201);

    await agent
      .get('/services')
      .query({
        vehicleId: vehicle.body.id,
        type: ServiceType.OIL_CHANGE,
        providerName: ' SECOND ',
        from: '2026-07-01',
        to: '2026-07-31',
        page: 1,
        pageSize: 1,
      })
      .expect(200)
      .expect(({ body }) => {
        expect(body).toMatchObject({
          total: 1,
          totalCost: '250.50',
          page: 1,
          pageSize: 1,
          totalPages: 1,
        });
        expect(body.items.map(({ id }: { id: string }) => id)).toEqual([
          latest.body.id,
        ]);
      });
    await agent
      .get('/services')
      .query({ page: 4, pageSize: 1 })
      .expect(200)
      .expect(({ body }) =>
        expect(body).toEqual({
          items: [],
          total: 3,
          totalCost: '1349.50',
          page: 4,
          pageSize: 1,
          totalPages: 3,
        }),
      );
    await agent
      .get('/services')
      .query({ from: '2026-08-02', to: '2026-08-01' })
      .expect(400);
  });

  it('reads, partially updates, moves, and hides Services with deleted Vehicles', async () => {
    const agent = await signedIn('service-update@example.com');
    const first = await agent
      .post('/vehicles')
      .send(vehicleBody('UPDATE1'))
      .expect(201);
    const second = await agent
      .post('/vehicles')
      .send(vehicleBody('UPDATE2'))
      .expect(201);
    const created = await agent
      .post('/services')
      .send(service(first.body.id))
      .expect(201);

    await agent
      .patch(`/services/${created.body.id}`)
      .send({ providerName: 'New Garage' })
      .expect(200)
      .expect(({ body }) => {
        expect(body).toMatchObject({
          vehicleId: first.body.id,
          cost: '499.99',
          providerName: 'New Garage',
        });
      });
    await agent
      .patch(`/services/${created.body.id}`)
      .send({ vehicleId: second.body.id, notes: null })
      .expect(200)
      .expect(({ body }) => {
        expect(body.vehicleId).toBe(second.body.id);
        expect(body.vehicle.id).toBe(second.body.id);
        expect(body.notes).toBeNull();
      });
    await agent
      .get(`/services/${created.body.id}`)
      .expect(200)
      .expect(({ body }) => expect(body.providerName).toBe('New Garage'));
    await agent.delete(`/vehicles/${second.body.id}`).expect(204);
    await agent.get(`/services/${created.body.id}`).expect(404);
    await agent
      .get('/services')
      .expect(200)
      .expect(({ body }) =>
        expect(body).toEqual({
          items: [],
          total: 0,
          totalCost: '0.00',
          page: 1,
          pageSize: 20,
          totalPages: 0,
        }),
      );
  });

  it('validates Service writes', async () => {
    const agent = await signedIn('service-validation@example.com');
    const vehicleResponse = await agent
      .post('/vehicles')
      .send(vehicleBody('VALID1'))
      .expect(201);
    const future = new Date();
    future.setUTCDate(future.getUTCDate() + 1);

    await agent.post('/services').send({}).expect(400);
    await agent
      .post('/services')
      .send(
        service(vehicleResponse.body.id, {
          serviceDate: future.toISOString().slice(0, 10),
        }),
      )
      .expect(400);
    await agent
      .post('/services')
      .send(service(vehicleResponse.body.id, { cost: 0 }))
      .expect(400);
    await agent
      .post('/services')
      .send(service(vehicleResponse.body.id, { type: 'UNKNOWN' }))
      .expect(400);
    await agent
      .post('/services')
      .send(service(vehicleResponse.body.id, { notes: 'x'.repeat(5001) }))
      .expect(400);
    const created = await agent
      .post('/services')
      .send(service(vehicleResponse.body.id))
      .expect(201);
    await agent
      .patch(`/services/${created.body.id}`)
      .send({ providerName: null })
      .expect(400);
  });

  it('limits MANAGER operations to Services on granted Vehicles', async () => {
    const admin = await signedIn('service-manager-admin@example.com');
    const { manager, userId } = await inviteManager(
      admin,
      'service-manager@example.com',
    );
    const granted = await admin
      .post('/vehicles')
      .send(vehicleBody('MANAGER1'))
      .expect(201);
    const hidden = await admin
      .post('/vehicles')
      .send(vehicleBody('MANAGER2'))
      .expect(201);
    await admin
      .post(`/vehicles/${granted.body.id}/managers`)
      .send({ managerId: userId })
      .expect(201);
    const visibleService = await admin
      .post('/services')
      .send(service(granted.body.id))
      .expect(201);
    const hiddenService = await admin
      .post('/services')
      .send(service(hidden.body.id))
      .expect(201);

    await manager.get(`/services/${visibleService.body.id}`).expect(200);
    await manager.get(`/services/${hiddenService.body.id}`).expect(404);
    await manager
      .get('/services')
      .expect(200)
      .expect(({ body }) =>
        expect(body.items.map(({ id }: { id: string }) => id)).toEqual([
          visibleService.body.id,
        ]),
      );
    await manager
      .get('/services')
      .query({ vehicleId: hidden.body.id })
      .expect(404);
    await manager
      .post('/services')
      .send(service(granted.body.id, { providerName: 'Manager Garage' }))
      .expect(201);
    await manager.post('/services').send(service(hidden.body.id)).expect(404);
    await manager
      .patch(`/services/${visibleService.body.id}`)
      .send({ vehicleId: hidden.body.id })
      .expect(404);
  });

  it('hides Services from other Workspaces', async () => {
    const first = await signedIn('service-tenant-one@example.com');
    const second = await signedIn('service-tenant-two@example.com');
    const vehicleResponse = await first
      .post('/vehicles')
      .send(vehicleBody('TENANT1'))
      .expect(201);
    const created = await first
      .post('/services')
      .send(service(vehicleResponse.body.id))
      .expect(201);

    await second.get(`/services/${created.body.id}`).expect(404);
    await second
      .patch(`/services/${created.body.id}`)
      .send({ providerName: 'Foreign Garage' })
      .expect(404);
    await second
      .get('/services')
      .expect(200)
      .expect(({ body }) => expect(body.items).toEqual([]));
    await second
      .get('/services')
      .query({ vehicleId: vehicleResponse.body.id })
      .expect(404);
  });

  it('requires authentication', async () => {
    await request(app.getHttpServer()).get('/services').expect(401);
  });
});
