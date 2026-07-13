import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { UserRole } from '../src/users/users.entity';
import { createTestApp } from './helpers/create-test-app';
import {
  captureEmittedEvents,
  createVerifiedUser,
} from './helpers/auth-test-utils';

describe('Drivers (e2e)', () => {
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

  async function inviteManager(
    admin: ReturnType<typeof request.agent>,
    email: string,
  ) {
    const events = captureEmittedEvents(app);
    try {
      const response = await admin
        .post('/users')
        .send({ email, role: UserRole.MANAGER })
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
      return { manager, user: response.body };
    } finally {
      events.restore();
    }
  }

  function vehicle(overrides: Record<string, unknown> = {}) {
    return {
      brand: 'Volvo',
      model: 'FH',
      registrationNumber: 'DRV123',
      ...overrides,
    };
  }

  it('manages drivers and preserves assignment history', async () => {
    const admin = await signedIn('drivers-admin@example.com');
    const driver = await admin
      .post('/drivers')
      .send({
        firstName: ' Jan ',
        lastName: ' Kowalski ',
        email: ' JAN@EXAMPLE.COM ',
        phone: ' 123456789 ',
      })
      .expect(201);
    expect(driver.body).toMatchObject({
      firstName: 'Jan',
      lastName: 'Kowalski',
      email: 'jan@example.com',
      phone: '123456789',
    });
    expect(driver.body.companyId).toBeUndefined();

    const created = await admin
      .post('/vehicles')
      .send(vehicle({ driverIds: [driver.body.id] }))
      .expect(201);
    expect(created.body.driverIds).toEqual([driver.body.id]);

    await admin
      .post(`/vehicles/${created.body.id}/drivers`)
      .send({ driverId: driver.body.id })
      .expect(409);
    await admin
      .delete(`/vehicles/${created.body.id}/drivers/${driver.body.id}`)
      .expect(204);
    await admin
      .post(`/vehicles/${created.body.id}/drivers`)
      .send({ driverId: driver.body.id })
      .expect(201);
    await admin
      .get(`/vehicles/${created.body.id}/driver-assignments`)
      .expect(200)
      .expect((res) => {
        expect(res.body).toHaveLength(2);
        expect(
          res.body.filter(
            ({ assignedTo }: { assignedTo: string | null }) =>
              assignedTo === null,
          ),
        ).toHaveLength(1);
      });

    await admin
      .patch(`/drivers/${driver.body.id}`)
      .send({ notes: ' Main driver ' })
      .expect(200)
      .expect((res) => expect(res.body.notes).toBe('Main driver'));
    await admin.delete(`/drivers/${driver.body.id}`).expect(204);
    await admin.get(`/drivers/${driver.body.id}`).expect(404);
    await admin
      .get(`/vehicles/${created.body.id}/driver-assignments`)
      .expect(200)
      .expect((res) => {
        expect(res.body).toHaveLength(2);
        expect(
          res.body.every(
            ({ assignedTo }: { assignedTo: string | null }) =>
              assignedTo !== null,
          ),
        ).toBe(true);
      });
    await admin.delete(`/vehicles/${created.body.id}`).expect(204);
    await admin
      .get(`/vehicles/${created.body.id}/driver-assignments`)
      .expect(200)
      .expect((res) => expect(res.body).toHaveLength(2));
  });

  it('limits manager writes to assigned vehicles and reserves delete for admin', async () => {
    const admin = await signedIn('driver-scope-admin@example.com');
    const { manager, user } = await inviteManager(
      admin,
      'driver-scope-manager@example.com',
    );
    const driver = await manager
      .post('/drivers')
      .send({ firstName: 'Anna', lastName: 'Nowak' })
      .expect(201);
    await manager
      .patch(`/drivers/${driver.body.id}`)
      .send({ phone: '555111222' })
      .expect(200);
    await manager.delete(`/drivers/${driver.body.id}`).expect(403);

    const assigned = await admin
      .post('/vehicles')
      .send(vehicle({ managerIds: [user.id], registrationNumber: 'DRV201' }))
      .expect(201);
    const unassigned = await admin
      .post('/vehicles')
      .send(vehicle({ registrationNumber: 'DRV202' }))
      .expect(201);

    await manager
      .post(`/vehicles/${assigned.body.id}/drivers`)
      .send({ driverId: driver.body.id })
      .expect(201);
    await manager
      .post(`/vehicles/${unassigned.body.id}/drivers`)
      .send({ driverId: driver.body.id })
      .expect(404);
  });

  it('isolates drivers between companies', async () => {
    const first = await signedIn('driver-first@example.com');
    const second = await signedIn('driver-second@example.com');
    const driver = await first
      .post('/drivers')
      .send({ firstName: 'Tenant', lastName: 'One' })
      .expect(201);

    await second.get(`/drivers/${driver.body.id}`).expect(404);
    await second
      .patch(`/drivers/${driver.body.id}`)
      .send({ firstName: 'Stolen' })
      .expect(404);
    await second
      .get('/drivers')
      .expect(200)
      .expect((res) => expect(res.body).toEqual([]));
  });
});
