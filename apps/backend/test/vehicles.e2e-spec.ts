import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { DataSource } from 'typeorm';
import { MembershipRole } from '../src/users/membership-role';
import { VehicleFuelType } from '../src/vehicles/vehicles.entity';
import { createTestApp } from './helpers/create-test-app';
import {
  captureEmittedEvents,
  createVerifiedUser,
} from './helpers/auth-test-utils';

describe('Vehicles (e2e)', () => {
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

  function vehicle(overrides: Record<string, unknown> = {}) {
    return {
      brand: 'BMW',
      model: 'X5',
      productionYear: 2020,
      fuelType: VehicleFuelType.DIESEL,
      vin: 'WBA123456789ABCDE',
      registrationNumber: 'WA 123-45',
      currentMileage: 100000,
      purchaseDate: '2024-05-10',
      ocExpiry: '2027-01-10',
      acExpiry: '2027-02-10',
      technicalInspectionExpiry: '2027-03-10',
      notes: ' Fleet car ',
      ...overrides,
    };
  }

  async function createVehicle(
    agent: ReturnType<typeof request.agent>,
    overrides: Record<string, unknown> = {},
  ) {
    return agent.post('/vehicles').send(vehicle(overrides)).expect(201);
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
      return { manager, user: response.body };
    } finally {
      events.restore();
    }
  }

  function dateAfter(days: number): string {
    const date = new Date();
    date.setUTCDate(date.getUTCDate() + days);
    return date.toISOString().slice(0, 10);
  }

  it('requires authentication', async () => {
    await request(app.getHttpServer()).get('/vehicles').expect(401);
  });

  it('projects current managers and driver in every vehicle view', async () => {
    const admin = await signedIn('vehicle-view@example.com');
    const created = await createVehicle(admin);
    const assertEmptyView = (body: Record<string, unknown>) => {
      expect(body.managers).toEqual([]);
      expect(body.driver).toBeNull();
      expect(body).not.toHaveProperty('managerIds');
      expect(body).not.toHaveProperty('driverIds');
    };

    assertEmptyView(created.body);
    const { user } = await inviteManager(
      admin,
      'vehicle-view-manager@example.com',
    );
    const driver = await admin
      .post('/drivers')
      .send({ firstName: 'Anna', lastName: 'Nowak' })
      .expect(201);
    await admin
      .post(`/vehicles/${created.body.id}/managers`)
      .send({ managerId: user.id })
      .expect(201);
    await admin
      .post(`/vehicles/${created.body.id}/drivers`)
      .send({ driverId: driver.body.id })
      .expect(201);
    const assertProjectedView = (body: Record<string, unknown>) => {
      expect(body.managers).toEqual([
        {
          id: user.id,
          firstName: null,
          lastName: null,
          email: 'vehicle-view-manager@example.com',
        },
      ]);
      expect(body.driver).toEqual({
        id: driver.body.id,
        firstName: 'Anna',
        lastName: 'Nowak',
      });
      expect(body).not.toHaveProperty('managerIds');
      expect(body).not.toHaveProperty('driverIds');
    };
    await admin
      .get('/vehicles')
      .expect(200)
      .expect((res) => assertProjectedView(res.body.items[0]));
    await admin
      .get(`/vehicles/${created.body.id}`)
      .expect(200)
      .expect((res) => assertProjectedView(res.body));
    await admin
      .patch(`/vehicles/${created.body.id}`)
      .send({ notes: 'Updated' })
      .expect(200)
      .expect((res) => assertProjectedView(res.body));
    await admin
      .delete(`/vehicles/${created.body.id}/drivers/${driver.body.id}`)
      .expect(204);
    await admin
      .get(`/vehicles/${created.body.id}`)
      .expect(200)
      .expect((res) => expect(res.body.driver).toBeNull());
  });

  it('loads projections with query count independent of page size', async () => {
    const admin = await signedIn('vehicle-query-count@example.com');
    await createVehicle(admin, { vin: null, registrationNumber: 'QUERY1' });
    const query = jest.spyOn(app.get(DataSource).logger, 'logQuery');
    try {
      await admin.get('/vehicles').expect(200);
      const oneVehicle = query.mock.calls.length;
      await createVehicle(admin, { vin: null, registrationNumber: 'QUERY2' });
      query.mockClear();

      await admin.get('/vehicles').expect(200);

      expect(query).toHaveBeenCalledTimes(oneVehicle);
    } finally {
      query.mockRestore();
    }
  });

  it('supports ADMIN CRUD, normalization and identifier reuse after delete', async () => {
    const admin = await signedIn('vehicle-admin@example.com');

    await admin
      .post('/vehicles')
      .send({ ...vehicle(), companyId: '00000000-0000-0000-0000-000000000000' })
      .expect(400);
    const created = await createVehicle(admin);
    expect(created.body).toMatchObject({
      brand: 'BMW',
      model: 'X5',
      vin: 'WBA123456789ABCDE',
      registrationNumber: 'WA12345',
      notes: 'Fleet car',
    });
    expect(created.body.companyId).toBeUndefined();
    expect(created.body.deletedAt).toBeUndefined();

    await admin
      .get(`/vehicles/${created.body.id}`)
      .expect(200)
      .expect((res) => expect(res.body.id).toBe(created.body.id));
    await admin
      .patch(`/vehicles/${created.body.id}`)
      .send({ model: ' X6 ', currentMileage: 110000 })
      .expect(200)
      .expect((res) => {
        expect(res.body).toMatchObject({ model: 'X6', currentMileage: 110000 });
      });
    await admin.delete(`/vehicles/${created.body.id}`).expect(204);
    await admin.get(`/vehicles/${created.body.id}`).expect(404);
    await createVehicle(admin).then((res) => {
      expect(res.body.registrationNumber).toBe('WA12345');
    });
  });

  it('allows MANAGER to modify only assigned vehicles, but not create them', async () => {
    const admin = await signedIn('vehicle-manager-admin@example.com');
    const { manager, user } = await inviteManager(
      admin,
      'vehicle-manager@example.com',
    );
    await manager
      .post('/vehicles')
      .send(
        vehicle({
          vin: null,
          registrationNumber: 'BLOCKED1',
        }),
      )
      .expect(403);
    const created = await createVehicle(admin, {
      vin: null,
      registrationNumber: 'MAN123',
    });
    await admin
      .post(`/vehicles/${created.body.id}/managers`)
      .send({ managerId: user.id })
      .expect(201);
    await manager.get('/vehicles').expect(200);
    await manager
      .patch(`/vehicles/${created.body.id}`)
      .send({ notes: 'Managed' })
      .expect(200);
    await manager.delete(`/vehicles/${created.body.id}`).expect(204);
  });

  it('limits MANAGER access to assigned vehicles', async () => {
    const admin = await signedIn('scope-admin@example.com');
    const { manager, user } = await inviteManager(
      admin,
      'scope-manager@example.com',
    );
    const unassigned = await createVehicle(admin, {
      vin: 'WAU123456789ABCDE',
      registrationNumber: 'SCOPE1',
    });

    await manager
      .get('/vehicles')
      .expect(200)
      .expect((res) => expect(res.body.total).toBe(0));
    await manager.get(`/vehicles/${unassigned.body.id}`).expect(404);
    await admin
      .post(`/vehicles/${unassigned.body.id}/managers`)
      .send({ managerId: user.id })
      .expect(201);
    await admin
      .get(`/vehicles/${unassigned.body.id}`)
      .expect(200)
      .expect((res) =>
        expect(res.body.managers.map(({ id }: { id: string }) => id)).toEqual([
          user.id,
        ]),
      );
    await manager.get(`/vehicles/${unassigned.body.id}`).expect(200);
    const second = await inviteManager(admin, 'scope-manager-two@example.com');
    await admin
      .post(`/vehicles/${unassigned.body.id}/managers`)
      .send({ managerId: second.user.id })
      .expect(201);
    await admin
      .get(`/vehicles/${unassigned.body.id}`)
      .expect(200)
      .expect((res) =>
        expect(
          res.body.managers.map(({ id }: { id: string }) => id).sort(),
        ).toEqual([user.id, second.user.id].sort()),
      );
    await second.manager.get(`/vehicles/${unassigned.body.id}`).expect(200);
    await admin
      .get(`/vehicles/${unassigned.body.id}/manager-assignments`)
      .expect(200)
      .expect((res) => expect(res.body).toHaveLength(2));
    await admin
      .delete(`/vehicles/${unassigned.body.id}/managers/${second.user.id}`)
      .expect(204);
    await admin
      .get(`/vehicles/${unassigned.body.id}`)
      .expect(200)
      .expect((res) =>
        expect(res.body.managers.map(({ id }: { id: string }) => id)).toEqual([
          user.id,
        ]),
      );
    await admin
      .get(`/vehicles/${unassigned.body.id}/manager-assignments`)
      .expect(200)
      .expect((res) => {
        const closed = res.body.find(
          ({ managerId }: { managerId: string }) =>
            managerId === second.user.id,
        );
        expect(closed.assignedTo).not.toBeNull();
      });
    await manager
      .patch(`/vehicles/${unassigned.body.id}`)
      .send({ notes: 'Manager update' })
      .expect(200);
    await manager
      .post(`/vehicles/${unassigned.body.id}/managers`)
      .send({ managerId: user.id })
      .expect(403);
    await admin
      .patch(`/vehicles/${unassigned.body.id}`)
      .send({ managerIds: [] })
      .expect(400);

    const foreignManager = await signedIn('foreign-manager@example.com');
    await app.get(DataSource).query(
      `UPDATE "memberships" SET "role" = 'MANAGER'
       WHERE "userId" = (SELECT "id" FROM "users" WHERE "email" = $1)`,
      ['foreign-manager@example.com'],
    );
    const foreignMe = await foreignManager.get('/auth/me').expect(200);
    await admin
      .post(`/vehicles/${unassigned.body.id}/managers`)
      .send({ managerId: foreignMe.body.id })
      .expect(400);
    await manager.delete(`/vehicles/${unassigned.body.id}`).expect(204);
  });

  it('filters visible vehicles by active manager access', async () => {
    const owner = await signedIn('manager-filter-owner@example.com');
    const selected = await inviteManager(
      owner,
      'manager-filter-selected@example.com',
    );
    const viewer = await inviteManager(
      owner,
      'manager-filter-viewer@example.com',
    );
    const admin = await inviteManager(
      owner,
      'manager-filter-admin@example.com',
    );
    await owner
      .patch(`/users/${admin.user.id}`)
      .send({ role: MembershipRole.ADMIN })
      .expect(200);
    const targetOnly = await createVehicle(owner, {
      brand: 'Audi',
      vin: null,
      registrationNumber: 'FILTER1',
    });
    const shared = await createVehicle(owner, {
      brand: 'Volvo',
      vin: null,
      registrationNumber: 'FILTER2',
    });
    const closed = await createVehicle(owner, {
      brand: 'BMW',
      vin: null,
      registrationNumber: 'FILTER3',
    });
    const viewerOnly = await createVehicle(owner, {
      brand: 'Ford',
      vin: null,
      registrationNumber: 'FILTER4',
    });
    for (const vehicleId of [
      targetOnly.body.id,
      shared.body.id,
      closed.body.id,
    ]) {
      await owner
        .post(`/vehicles/${vehicleId}/managers`)
        .send({ managerId: selected.user.id })
        .expect(201);
    }
    for (const vehicleId of [shared.body.id, viewerOnly.body.id]) {
      await owner
        .post(`/vehicles/${vehicleId}/managers`)
        .send({ managerId: viewer.user.id })
        .expect(201);
    }
    await owner
      .delete(`/vehicles/${closed.body.id}/managers/${selected.user.id}`)
      .expect(204);

    await owner
      .get('/vehicles')
      .query({
        managerId: selected.user.id,
        page: 1,
        pageSize: 1,
        sortBy: 'brand',
        sortOrder: 'asc',
      })
      .expect(200)
      .expect(({ body }) => {
        expect(body).toMatchObject({ total: 2, totalPages: 2 });
        expect(body.items.map(({ id }: { id: string }) => id)).toEqual([
          targetOnly.body.id,
        ]);
      });
    await admin.manager
      .get('/vehicles')
      .query({ managerId: selected.user.id, search: 'Volvo' })
      .expect(200)
      .expect(({ body }) => {
        expect(body.total).toBe(1);
        expect(body.items[0].id).toBe(shared.body.id);
      });
    await viewer.manager
      .get('/vehicles')
      .query({ managerId: selected.user.id })
      .expect(200)
      .expect(({ body }) => {
        expect(body.total).toBe(1);
        expect(body.items[0].id).toBe(shared.body.id);
      });
    const foreignOwner = await signedIn('manager-filter-foreign@example.com');
    await foreignOwner
      .get('/vehicles')
      .query({ managerId: selected.user.id })
      .expect(200)
      .expect(({ body }) => expect(body.total).toBe(0));
    await owner.get('/vehicles').query({ managerId: 'not-a-uuid' }).expect(400);
  });

  it('clears assignments when a manager changes role or is deleted', async () => {
    const admin = await signedIn('manager-lifecycle-admin@example.com');
    const first = await inviteManager(admin, 'promoted-manager@example.com');
    const created = await createVehicle(admin, {
      vin: 'WAU123456789ABCDE',
      registrationNumber: 'LIFE1',
    });
    await admin
      .post(`/vehicles/${created.body.id}/managers`)
      .send({ managerId: first.user.id })
      .expect(201);

    await admin
      .patch(`/users/${first.user.id}`)
      .send({ role: MembershipRole.ADMIN })
      .expect(200);
    await admin
      .get(`/vehicles/${created.body.id}`)
      .expect(200)
      .expect((res) => expect(res.body.managers).toEqual([]));

    const second = await inviteManager(admin, 'deleted-manager@example.com');
    await admin
      .post(`/vehicles/${created.body.id}/managers`)
      .send({ managerId: second.user.id })
      .expect(201);
    await admin.delete(`/users/${second.user.id}`).expect(204);
    await admin
      .get(`/vehicles/${created.body.id}`)
      .expect(200)
      .expect((res) => expect(res.body.managers).toEqual([]));
    await admin.delete(`/vehicles/${created.body.id}`).expect(204);
    await admin
      .get(`/vehicles/${created.body.id}/manager-assignments`)
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
  });

  it('isolates tenants while allowing tenant-local identifiers', async () => {
    const first = await signedIn('vehicle-first@example.com');
    const second = await signedIn('vehicle-second@example.com');
    const firstVehicle = await createVehicle(first);
    const secondVehicle = await createVehicle(second);
    const firstManager = await inviteManager(
      first,
      'vehicle-first-manager@example.com',
    );
    const secondManager = await inviteManager(
      second,
      'vehicle-second-manager@example.com',
    );
    const firstDriver = await first
      .post('/drivers')
      .send({ firstName: 'First', lastName: 'Driver' })
      .expect(201);
    const secondDriver = await second
      .post('/drivers')
      .send({ firstName: 'Second', lastName: 'Driver' })
      .expect(201);
    await first
      .post(`/vehicles/${firstVehicle.body.id}/managers`)
      .send({ managerId: firstManager.user.id })
      .expect(201);
    await second
      .post(`/vehicles/${secondVehicle.body.id}/managers`)
      .send({ managerId: secondManager.user.id })
      .expect(201);
    await first
      .post(`/vehicles/${firstVehicle.body.id}/drivers`)
      .send({ driverId: firstDriver.body.id })
      .expect(201);
    await second
      .post(`/vehicles/${secondVehicle.body.id}/drivers`)
      .send({ driverId: secondDriver.body.id })
      .expect(201);

    await second.get(`/vehicles/${firstVehicle.body.id}`).expect(404);
    await second
      .patch(`/vehicles/${firstVehicle.body.id}`)
      .send({ model: 'Stolen' })
      .expect(404);
    await second.delete(`/vehicles/${firstVehicle.body.id}`).expect(404);
    await second
      .get('/vehicles')
      .expect(200)
      .expect((res) => {
        expect(res.body.total).toBe(1);
        expect(res.body.items[0].id).not.toBe(firstVehicle.body.id);
        expect(res.body.items[0].managers).toEqual([
          expect.objectContaining({ id: secondManager.user.id }),
        ]);
        expect(res.body.items[0].driver).toEqual({
          id: secondDriver.body.id,
          firstName: 'Second',
          lastName: 'Driver',
        });
        expect(res.body.items[0].managers).not.toContainEqual(
          expect.objectContaining({ id: firstManager.user.id }),
        );
        expect(res.body.items[0].driver.id).not.toBe(firstDriver.body.id);
      });
  });

  it('enforces validation and database uniqueness under concurrency', async () => {
    const admin = await signedIn('vehicle-conflict@example.com');
    await createVehicle(admin);

    await admin
      .post('/vehicles')
      .send(
        vehicle({
          vin: 'WAUZZZF4XGEXXXXXX',
          registrationNumber: 'wa-123 45',
        }),
      )
      .expect(409);
    await admin
      .post('/vehicles')
      .send(
        vehicle({
          vin: 'wba123456789abcde',
          registrationNumber: 'OTHER1',
        }),
      )
      .expect(409);

    const concurrent = await Promise.all([
      admin.post('/vehicles').send(
        vehicle({
          vin: 'WAU123456789ABCDE',
          registrationNumber: 'RACE123',
        }),
      ),
      admin.post('/vehicles').send(
        vehicle({
          vin: 'WAU123456789ABCDF',
          registrationNumber: 'RACE123',
        }),
      ),
    ]);
    expect(concurrent.map(({ status }) => status).sort()).toEqual([201, 409]);

    await admin
      .post('/vehicles')
      .send(vehicle({ vin: 'invalid' }))
      .expect(400);
    await admin
      .post('/vehicles')
      .send(vehicle({ currentMileage: -1, registrationNumber: 'NEG123' }))
      .expect(400);
    await admin
      .post('/vehicles')
      .send(vehicle({ currentMileage: true, registrationNumber: 'BOOL123' }))
      .expect(400);
    await admin
      .post('/vehicles')
      .send(vehicle({ managerIds: [], registrationNumber: 'ACCESS1' }))
      .expect(400);
    const existing = await admin.get('/vehicles').expect(200);
    await admin
      .patch(`/vehicles/${existing.body.items[0].id}`)
      .send({ driverIds: [] })
      .expect(400);
    await admin
      .post('/vehicles')
      .send(
        vehicle({
          productionYear: new Date().getFullYear() + 1,
          registrationNumber: 'YEAR123',
        }),
      )
      .expect(400);
    await admin
      .post('/vehicles')
      .send(
        vehicle({
          purchaseDate: '2025-01-01T00:00:00Z',
          registrationNumber: 'TIME123',
        }),
      )
      .expect(400);
    await admin
      .post('/vehicles')
      .send(
        vehicle({ purchaseDate: '2999-01-01', registrationNumber: 'DATE123' }),
      )
      .expect(400);
    await admin
      .patch(`/vehicles/${existing.body.items[0].id}`)
      .send({})
      .expect(400);
  });

  it('paginates, searches, sorts and filters expiry dates', async () => {
    const admin = await signedIn('vehicle-list@example.com');
    await createVehicle(admin, {
      brand: 'Volvo',
      model: 'XC60',
      vin: 'YV1123456789ABCDE',
      registrationNumber: 'KR 111AA',
      ocExpiry: dateAfter(5),
    });
    await createVehicle(admin, {
      brand: 'Audi',
      model: 'A4',
      vin: 'WAU123456789ABCDE',
      registrationNumber: 'GD 222BB',
      ocExpiry: dateAfter(40),
    });
    await createVehicle(admin, {
      brand: 'BMW',
      model: 'X3',
      vin: null,
      registrationNumber: 'PO 333CC',
      ocExpiry: null,
    });

    await admin
      .get('/vehicles')
      .query({ page: 1, pageSize: 2, sortBy: 'brand', sortOrder: 'asc' })
      .expect(200)
      .expect((res) => {
        expect(res.body).toMatchObject({
          page: 1,
          pageSize: 2,
          total: 3,
          totalPages: 2,
        });
        expect(
          res.body.items.map(({ brand }: { brand: string }) => brand),
        ).toEqual(['Audi', 'BMW']);
      });
    await admin
      .get('/vehicles')
      .query({ search: 'KR 111-AA' })
      .expect(200)
      .expect((res) => expect(res.body.items[0].brand).toBe('Volvo'));
    await admin
      .get('/vehicles')
      .query({ expiryType: 'oc', expiresWithinDays: 30 })
      .expect(200)
      .expect((res) => {
        expect(res.body.total).toBe(1);
        expect(res.body.items[0].brand).toBe('Volvo');
      });
    await admin.get('/vehicles').query({ expiresWithinDays: 30 }).expect(400);
    await admin.get('/vehicles').query({ page: 10001 }).expect(400);
    await admin
      .get('/vehicles')
      .query({ search: '%' })
      .expect(200)
      .expect((res) => expect(res.body.total).toBe(0));
  });

  it('handles update conflicts and clears nullable fields', async () => {
    const admin = await signedIn('vehicle-update@example.com');
    const first = await createVehicle(admin);
    const second = await createVehicle(admin, {
      vin: 'WAU123456789ABCDE',
      registrationNumber: 'SECOND1',
    });

    await admin
      .patch(`/vehicles/${second.body.id}`)
      .send({ registrationNumber: first.body.registrationNumber })
      .expect(409);
    await admin
      .patch(`/vehicles/${second.body.id}`)
      .send({ vin: first.body.vin })
      .expect(409);
    await admin
      .patch(`/vehicles/${second.body.id}`)
      .send({
        vin: null,
        currentMileage: null,
        purchaseDate: null,
        notes: null,
      })
      .expect(200)
      .expect((res) => {
        expect(res.body).toMatchObject({
          vin: null,
          currentMileage: null,
          purchaseDate: null,
          notes: null,
        });
      });
  });
});
