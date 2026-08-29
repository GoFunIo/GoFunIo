import { INestApplication } from '@nestjs/common';
import { randomUUID } from 'crypto';
import request from 'supertest';
import { App } from 'supertest/types';
import { DataSource } from 'typeorm';
import { MembershipRole } from '../src/users/membership-role';
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

  async function signedIn(email: string, password = 'Password123!') {
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
        .send({ email, role: MembershipRole.MANAGER })
        .expect(201);
      if (!events.passwordResetToken) throw new Error('Expected invite token');
      await request(app.getHttpServer())
        .post('/auth/reset-password')
        .send({
          token: events.passwordResetToken,
          password: 'Manager-password1!',
        })
        .expect(204);
      const manager = request.agent(app.getHttpServer());
      await manager
        .post('/auth/signin')
        .send({ email, password: 'Manager-password1!' })
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

  async function assignManager(
    admin: ReturnType<typeof request.agent>,
    vehicleId: string,
    managerId: string,
  ) {
    await admin
      .post(`/vehicles/${vehicleId}/managers`)
      .send({ managerId })
      .expect(201);
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

    const created = await admin.post('/vehicles').send(vehicle()).expect(201);
    expect(created.body.drivers).toEqual([]);

    await admin
      .post(`/vehicles/${created.body.id}/drivers`)
      .send({ driverId: driver.body.id })
      .expect(201);
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

  it('keeps multiple active drivers without duplicating an allocation', async () => {
    const admin = await signedIn('driver-replacement-admin@example.com');
    const first = await admin
      .post('/drivers')
      .send({ firstName: 'First', lastName: 'Driver' })
      .expect(201);
    const second = await admin
      .post('/drivers')
      .send({ firstName: 'Second', lastName: 'Driver' })
      .expect(201);

    await admin
      .post('/vehicles')
      .send(
        vehicle({
          driverIds: [first.body.id, second.body.id],
          registrationNumber: 'DRV102',
        }),
      )
      .expect(400);
    const created = await admin
      .post('/vehicles')
      .send(vehicle({ registrationNumber: 'DRV103' }))
      .expect(201);
    await admin
      .post(`/vehicles/${created.body.id}/drivers`)
      .send({ driverId: first.body.id })
      .expect(201);
    await admin
      .post(`/vehicles/${created.body.id}/drivers`)
      .send({ driverId: second.body.id })
      .expect(201);
    await admin
      .post(`/vehicles/${created.body.id}/drivers`)
      .send({ driverId: second.body.id })
      .expect(201);

    await admin
      .get(`/vehicles/${created.body.id}/driver-assignments`)
      .expect(200)
      .expect((res) => {
        expect(res.body).toHaveLength(2);
        expect(
          res.body
            .filter(
              ({ assignedTo }: { assignedTo: string | null }) =>
                assignedTo === null,
            )
            .map(({ driverId }: { driverId: string }) => driverId),
        ).toEqual(expect.arrayContaining([first.body.id, second.body.id]));
      });
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
      .send(vehicle({ registrationNumber: 'DRV201' }))
      .expect(201);
    await assignManager(admin, assigned.body.id, user.id);
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

  it('shows managers unallocated or accessible drivers, including shared drivers', async () => {
    const admin = await signedIn('driver-visibility-admin@example.com');
    const first = await inviteManager(
      admin,
      'driver-visibility-one@example.com',
    );
    const second = await inviteManager(
      admin,
      'driver-visibility-two@example.com',
    );
    const driver = await admin
      .post('/drivers')
      .send({ firstName: 'Shared', lastName: 'Driver' })
      .expect(201);

    await first.manager
      .get('/drivers')
      .expect(200)
      .expect((res) => {
        const visible = res.body.find(
          ({ id }: { id: string }) => id === driver.body.id,
        );
        expect(visible.activeVehicles).toEqual([]);
      });
    const firstVehicle = await admin
      .post('/vehicles')
      .send(vehicle({ registrationNumber: 'DRV301' }))
      .expect(201);
    await assignManager(admin, firstVehicle.body.id, first.user.id);
    await first.manager
      .post(`/vehicles/${firstVehicle.body.id}/drivers`)
      .send({ driverId: driver.body.id })
      .expect(201);
    await first.manager
      .get(`/drivers/${driver.body.id}`)
      .expect(200)
      .expect((res) =>
        expect(res.body.activeVehicles).toEqual([
          {
            id: firstVehicle.body.id,
            brand: 'Volvo',
            model: 'FH',
            registrationNumber: 'DRV301',
          },
        ]),
      );
    await second.manager
      .get('/drivers')
      .expect(200)
      .expect((res) =>
        expect(res.body.map(({ id }: { id: string }) => id)).not.toContain(
          driver.body.id,
        ),
      );
    await second.manager.get(`/drivers/${driver.body.id}`).expect(404);
    await second.manager
      .patch(`/drivers/${driver.body.id}`)
      .send({ notes: 'Hidden' })
      .expect(404);

    const secondVehicle = await admin
      .post('/vehicles')
      .send(vehicle({ registrationNumber: 'DRV302' }))
      .expect(201);
    await assignManager(admin, secondVehicle.body.id, second.user.id);
    await second.manager
      .post(`/vehicles/${secondVehicle.body.id}/drivers`)
      .send({ driverId: driver.body.id })
      .expect(201);
    await first.manager
      .get(`/drivers/${driver.body.id}`)
      .expect(200)
      .expect((res) =>
        expect(
          res.body.activeVehicles.map(({ id }: { id: string }) => id),
        ).toEqual([firstVehicle.body.id]),
      );
    await second.manager
      .get(`/drivers/${driver.body.id}`)
      .expect(200)
      .expect((res) =>
        expect(
          res.body.activeVehicles.map(({ id }: { id: string }) => id),
        ).toEqual([secondVehicle.body.id]),
      );
    await first.manager
      .patch(`/drivers/${driver.body.id}`)
      .send({ phone: '111222333' })
      .expect(200);
    await second.manager
      .patch(`/drivers/${driver.body.id}`)
      .send({ notes: 'Shared' })
      .expect(200);
    await admin
      .get('/drivers')
      .expect(200)
      .expect((res) => {
        const visible = res.body.find(
          ({ id }: { id: string }) => id === driver.body.id,
        );
        expect(
          visible.activeVehicles.map(({ id }: { id: string }) => id).sort(),
        ).toEqual([firstVehicle.body.id, secondVehicle.body.id].sort());
      });
    await admin
      .patch(`/drivers/${driver.body.id}`)
      .send({ notes: 'Admin' })
      .expect(200);
  });

  it('loads active vehicles with query count independent of driver count', async () => {
    const admin = await signedIn('driver-query-count@example.com');
    await admin
      .post('/drivers')
      .send({ firstName: 'First', lastName: 'Driver' })
      .expect(201);
    const query = jest.spyOn(app.get(DataSource).logger, 'logQuery');
    try {
      await admin.get('/drivers').expect(200);
      const oneDriver = query.mock.calls.length;
      await admin
        .post('/drivers')
        .send({ firstName: 'Second', lastName: 'Driver' })
        .expect(201);
      query.mockClear();

      await admin.get('/drivers').expect(200);

      expect(query).toHaveBeenCalledTimes(oneDriver);
    } finally {
      query.mockRestore();
    }
  });

  it('links one membership and preserves identity through removal', async () => {
    const admin = await signedIn('driver-link-admin@example.com');
    const { manager, user } = await inviteManager(
      admin,
      'driver-link-manager@example.com',
    );

    await manager
      .post('/drivers')
      .send({ firstName: 'Blocked', lastName: 'Link', userId: user.id })
      .expect(403);

    const driver = await admin
      .post('/drivers')
      .send({ firstName: 'Linked', lastName: 'Driver', userId: user.id })
      .expect(201);
    expect(driver.body.userId).toBe(user.id);

    await admin
      .post('/drivers')
      .send({ firstName: 'Duplicate', lastName: 'Driver', userId: user.id })
      .expect(409)
      .expect(({ body }) =>
        expect(body).toMatchObject({ code: 'MEMBERSHIP_ALREADY_LINKED' }),
      );
    await admin
      .post('/drivers')
      .send({ firstName: 'Ghost', lastName: 'Driver', userId: randomUUID() })
      .expect(400);

    const outsider = await signedIn('driver-link-outsider@example.com');
    await outsider
      .post('/drivers')
      .send({ firstName: 'Cross', lastName: 'Driver', userId: user.id })
      .expect(400);

    const created = await admin
      .post('/vehicles')
      .send(vehicle({ registrationNumber: 'DRV401' }))
      .expect(201);
    await admin
      .post(`/vehicles/${created.body.id}/drivers`)
      .send({ driverId: driver.body.id })
      .expect(201);
    await admin
      .patch(`/drivers/${driver.body.id}`)
      .send({ userId: null })
      .expect(200)
      .expect((res) => expect(res.body.userId).toBeNull());
    await manager
      .patch(`/drivers/${driver.body.id}`)
      .send({ userId: user.id })
      .expect(403);
    await admin
      .patch(`/drivers/${driver.body.id}`)
      .send({ userId: user.id })
      .expect(200);

    await admin.delete(`/users/${user.id}`).expect(204);
    await admin
      .get(`/drivers/${driver.body.id}`)
      .expect(200)
      .expect((res) => expect(res.body.userId).toBe(user.id));
    await admin
      .get(`/vehicles/${created.body.id}/driver-assignments`)
      .expect(200)
      .expect((res) =>
        expect(
          res.body.some(
            ({ assignedTo }: { assignedTo: string | null }) =>
              assignedTo === null,
          ),
        ).toBe(true),
      );

    const events = captureEmittedEvents(app);
    try {
      await admin
        .post('/users/invitations')
        .send({
          email: 'driver-link-manager@example.com',
          role: MembershipRole.MANAGER,
        })
        .expect(201);
      const invited = request.agent(app.getHttpServer());
      await invited
        .post('/auth/signin')
        .send({
          email: 'driver-link-manager@example.com',
          password: 'Manager-password1!',
        })
        .expect(201);
      await invited
        .post('/auth/invitations/accept')
        .send({ token: events.membershipInvitationToken })
        .expect(204);
    } finally {
      events.restore();
    }
    await admin
      .get(`/drivers/${driver.body.id}`)
      .expect(200)
      .expect((res) => expect(res.body.userId).toBe(user.id));
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
