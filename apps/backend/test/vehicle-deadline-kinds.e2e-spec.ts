import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { DataSource } from 'typeorm';
import { createTestApp } from './helpers/create-test-app';
import {
  captureEmittedEvents,
  createVerifiedUser,
} from './helpers/auth-test-utils';
import { MembershipRole } from '../src/users/membership-role';
import { NotificationDeliveryWorker } from '../src/notifications/notification-delivery-worker';
import type {
  NotificationEmailSender,
  NotificationEmailSendInput,
} from '../src/notifications/notification-email-sender';
import { VehicleDeadlineReconciliation } from '../src/notifications/vehicle-deadline-reconciliation';

type Agent = ReturnType<typeof request.agent>;
interface KindView {
  key: string;
  label: string;
  builtIn: boolean;
}

class FakeSender implements NotificationEmailSender {
  readonly calls: NotificationEmailSendInput[] = [];

  send(
    input: NotificationEmailSendInput,
  ): Promise<{ providerMessageId: string }> {
    this.calls.push(input);
    return Promise.resolve({ providerMessageId: `m-${this.calls.length}` });
  }
}

describe('Vehicle Deadline Kinds (e2e)', () => {
  let app: INestApplication<App>;
  let instant = new Date('2026-08-28T10:00:00.000Z');
  const sender = new FakeSender();

  beforeAll(async () => {
    app = (await createTestApp({
      clock: { now: () => new Date(instant) },
      notificationEmailSender: sender,
    })) as INestApplication<App>;
  });

  beforeEach(() => {
    instant = new Date('2026-08-28T10:00:00.000Z');
    sender.calls.length = 0;
  });

  afterAll(() => app.close());

  async function signedIn(email: string): Promise<Agent> {
    await createVerifiedUser(app, email, 'Password123!');
    const agent = request.agent(app.getHttpServer());
    await agent
      .post('/auth/signin')
      .send({ email, password: 'Password123!' })
      .expect(201);
    return agent;
  }

  async function invitedManager(owner: Agent, email: string): Promise<Agent> {
    const events = captureEmittedEvents(app);
    try {
      await owner
        .post('/users')
        .send({ email, role: MembershipRole.MANAGER })
        .expect(201);
      await request(app.getHttpServer())
        .post('/auth/reset-password')
        .send({ token: events.passwordResetToken, password: 'Invited-pass1!' })
        .expect(204);
      const agent = request.agent(app.getHttpServer());
      await agent
        .post('/auth/signin')
        .send({ email, password: 'Invited-pass1!' })
        .expect(201);
      return agent;
    } finally {
      events.restore();
    }
  }

  async function kinds(actor: Agent): Promise<KindView[]> {
    return (await actor.get('/vehicle-deadline-kinds').expect(200))
      .body as KindView[];
  }

  async function customKind(actor: Agent, label: string): Promise<string> {
    const kind = (await kinds(actor)).find((item) => item.label === label);
    if (!kind) throw new Error(`Missing kind ${label}`);
    return kind.key;
  }

  async function createVehicle(
    actor: Agent,
    registrationNumber: string,
    customDeadlines?: Array<{ kindId: string; date: string | null }>,
  ): Promise<string> {
    const response = await actor
      .post('/vehicles')
      .send({
        brand: 'Toyota',
        model: 'Corolla',
        registrationNumber,
        customDeadlines,
      })
      .expect(201);
    return response.body.id as string;
  }

  async function alerts(actor: Agent) {
    return (await actor.get('/vehicle-deadline-alerts').expect(200)).body
      .items as Array<Record<string, unknown>>;
  }

  async function notifications(actor: Agent) {
    return (await actor.get('/notifications').expect(200)).body.items as Array<
      Record<string, unknown>
    >;
  }

  it('lists built-in kinds with the seeded oil and spark plug kinds, enabled in the policy', async () => {
    const owner = await signedIn('kinds-list@example.com');

    const listed = await kinds(owner);

    expect(listed).toEqual([
      { key: 'OC', label: 'Ubezpieczenie OC', builtIn: true },
      { key: 'AC', label: 'Ubezpieczenie AC', builtIn: true },
      {
        key: 'TECHNICAL_INSPECTION',
        label: 'Przegląd techniczny',
        builtIn: true,
      },
      { key: expect.any(String), label: 'Wymiana oleju', builtIn: false },
      { key: expect.any(String), label: 'Wymiana świec', builtIn: false },
    ]);
    const policy = await owner.get('/alert-policy').expect(200);
    expect(policy.body.enabledDeadlineKinds).toEqual(
      listed.map(({ key }) => key),
    );
  });

  it('creates, renames, and deletes a kind while keeping the policy in step', async () => {
    const owner = await signedIn('kinds-crud@example.com');

    const created = await owner
      .post('/vehicle-deadline-kinds')
      .send({ label: '  Wymiana rozrządu  ' })
      .expect(201);
    expect(created.body).toEqual({
      key: expect.any(String),
      label: 'Wymiana rozrządu',
      builtIn: false,
    });
    const id = created.body.key as string;
    let policy = await owner.get('/alert-policy').expect(200);
    expect(policy.body.enabledDeadlineKinds).toContain(id);

    await owner
      .patch(`/vehicle-deadline-kinds/${id}`)
      .send({ label: 'Rozrząd' })
      .expect(200)
      .expect(({ body }) => expect(body.label).toBe('Rozrząd'));

    await owner.delete(`/vehicle-deadline-kinds/${id}`).expect(204);
    policy = await owner.get('/alert-policy').expect(200);
    expect(policy.body.enabledDeadlineKinds).not.toContain(id);
    await owner.delete(`/vehicle-deadline-kinds/${id}`).expect(404);
  });

  it('enforces roles, label rules, uniqueness, and the kind limit', async () => {
    const owner = await signedIn('kinds-rules@example.com');
    const manager = await invitedManager(owner, 'kinds-manager@example.com');

    await expect(kinds(manager)).resolves.toHaveLength(5);
    await manager
      .post('/vehicle-deadline-kinds')
      .send({ label: 'Nope' })
      .expect(403);
    await request(app.getHttpServer())
      .get('/vehicle-deadline-kinds')
      .expect(401);

    for (const label of ['', '   ', 'a'.repeat(61), 'Olej\r\nBcc: x']) {
      await owner.post('/vehicle-deadline-kinds').send({ label }).expect(400);
    }
    await owner
      .post('/vehicle-deadline-kinds')
      .send({ label: 'WYMIANA OLEJU' })
      .expect(409)
      .expect(({ body }) =>
        expect(body.code).toBe('VEHICLE_DEADLINE_KIND_LABEL_IN_USE'),
      );

    for (let index = 0; index < 18; index += 1) {
      await owner
        .post('/vehicle-deadline-kinds')
        .send({ label: `Rodzaj ${index}` })
        .expect(201);
    }
    await owner
      .post('/vehicle-deadline-kinds')
      .send({ label: 'Za dużo' })
      .expect(409)
      .expect(({ body }) =>
        expect(body.code).toBe('VEHICLE_DEADLINE_KIND_LIMIT_REACHED'),
      );
    const policy = await owner.get('/alert-policy').expect(200);
    expect(policy.body.enabledDeadlineKinds).toHaveLength(23);
  });

  it('isolates custom kinds between Workspaces', async () => {
    const first = await signedIn('kinds-tenant-a@example.com');
    const second = await signedIn('kinds-tenant-b@example.com');
    const foreignKind = await customKind(first, 'Wymiana oleju');
    const vehicle = await createVehicle(second, 'TENANT1');

    await second
      .patch(`/vehicle-deadline-kinds/${foreignKind}`)
      .send({ label: 'Przejęte' })
      .expect(404);
    await second.delete(`/vehicle-deadline-kinds/${foreignKind}`).expect(404);
    await second
      .patch('/alert-policy')
      .send({ enabledDeadlineKinds: ['OC', foreignKind] })
      .expect(400);
    await second
      .patch(`/vehicles/${vehicle}`)
      .send({
        customDeadlines: [{ kindId: foreignKind, date: '2026-09-01' }],
      })
      .expect(400);
  });

  it('turns a custom date into an alert, Notification, and email, and invalidates them when it changes', async () => {
    const owner = await signedIn('kinds-flow@example.com');
    const oil = await customKind(owner, 'Wymiana oleju');

    const vehicleId = await createVehicle(owner, 'FLOW001', [
      { kindId: oil, date: '2026-09-04' },
    ]);

    const vehicle = await owner.get(`/vehicles/${vehicleId}`).expect(200);
    expect(vehicle.body.customDeadlines).toEqual([
      { kindId: oil, label: 'Wymiana oleju', date: '2026-09-04' },
    ]);
    expect(await alerts(owner)).toEqual([
      expect.objectContaining({
        deadlineKind: oil,
        deadlineLabel: 'Wymiana oleju',
        deadlineDate: '2026-09-04',
        daysRemaining: 7,
      }),
    ]);
    await owner
      .get('/vehicle-deadline-alerts')
      .query({ deadlineKind: oil })
      .expect(200)
      .expect(({ body }) => expect(body.items).toHaveLength(1));
    await owner
      .get('/vehicle-deadline-alerts')
      .query({ deadlineKind: 'SERVICE' })
      .expect(400);
    expect(await notifications(owner)).toEqual([
      expect.objectContaining({
        deadlineKind: oil,
        deadlineLabel: 'Wymiana oleju',
        leadDay: 7,
      }),
    ]);

    await app.get(NotificationDeliveryWorker).processDue(instant);
    expect(sender.calls).toHaveLength(1);
    expect(sender.calls[0].subject).toBe(
      'Termin „Wymiana oleju” pojazdu FLOW001',
    );

    await owner
      .patch(`/vehicles/${vehicleId}`)
      .send({
        customDeadlines: [{ kindId: oil, date: '2027-03-01' }],
      })
      .expect(200);
    expect(await alerts(owner)).toEqual([]);
    expect(await notifications(owner)).toEqual([]);

    await app.get(VehicleDeadlineReconciliation).processDue();
    const [{ invalidated }] = await app
      .get(DataSource)
      .query<
        Array<{ invalidated: number }>
      >(`SELECT count(*)::int AS invalidated FROM notifications WHERE "invalidatedAt" IS NOT NULL`);
    expect(invalidated).toBe(1);
  });

  it('generates reached stages for custom dates during reconciliation', async () => {
    const owner = await signedIn('kinds-reconcile@example.com');
    const plugs = await customKind(owner, 'Wymiana świec');
    await createVehicle(owner, 'REC001', [
      { kindId: plugs, date: '2026-12-01' },
    ]);
    expect(await notifications(owner)).toEqual([]);

    instant = new Date('2026-11-02T10:00:00.000Z');
    await app.get(VehicleDeadlineReconciliation).processDue();

    expect(await notifications(owner)).toEqual([
      expect.objectContaining({
        deadlineKind: plugs,
        deadlineLabel: 'Wymiana świec',
        leadDay: 30,
      }),
    ]);
  });

  it('applies partial updates and removals without touching other kinds or Vehicle fields', async () => {
    const owner = await signedIn('kinds-partial@example.com');
    const oil = await customKind(owner, 'Wymiana oleju');
    const plugs = await customKind(owner, 'Wymiana świec');
    const vehicleId = await createVehicle(owner, 'PART001', [
      { kindId: oil, date: '2027-01-01' },
      { kindId: plugs, date: '2027-02-01' },
    ]);

    await owner
      .patch(`/vehicles/${vehicleId}`)
      .send({ customDeadlines: [{ kindId: oil, date: null }] })
      .expect(200)
      .expect(({ body }) => {
        expect(body.customDeadlines).toEqual([
          { kindId: plugs, label: 'Wymiana świec', date: '2027-02-01' },
        ]);
        expect(body.registrationNumber).toBe('PART001');
      });

    await owner
      .patch(`/vehicles/${vehicleId}`)
      .send({ notes: 'bez zmian terminów' })
      .expect(200)
      .expect(({ body }) => expect(body.customDeadlines).toHaveLength(1));

    for (const customDeadlines of [
      null,
      'x',
      [{ kindId: 'nope', date: '2027-01-01' }],
      [{ kindId: oil, date: 'jutro' }],
      [
        { kindId: oil, date: '2027-01-01' },
        { kindId: oil, date: '2027-01-02' },
      ],
    ]) {
      await owner
        .patch(`/vehicles/${vehicleId}`)
        .send({ customDeadlines })
        .expect(400);
    }
  });

  it('removes dates, alerts, and Notifications when a kind is deleted', async () => {
    const owner = await signedIn('kinds-delete@example.com');
    const oil = await customKind(owner, 'Wymiana oleju');
    const vehicleId = await createVehicle(owner, 'DEL001', [
      { kindId: oil, date: '2026-09-04' },
    ]);
    expect(await alerts(owner)).toHaveLength(1);

    await owner.delete(`/vehicle-deadline-kinds/${oil}`).expect(204);

    expect(await alerts(owner)).toEqual([]);
    expect(await notifications(owner)).toEqual([]);
    await owner
      .get(`/vehicles/${vehicleId}`)
      .expect(200)
      .expect(({ body }) => expect(body.customDeadlines).toEqual([]));
    await app.get(VehicleDeadlineReconciliation).processDue();
    await app.get(NotificationDeliveryWorker).processDue(instant);
    expect(sender.calls).toEqual([]);
  });

  it('keeps the label a Notification was created with after a rename', async () => {
    const owner = await signedIn('kinds-rename@example.com');
    const oil = await customKind(owner, 'Wymiana oleju');
    await createVehicle(owner, 'REN001', [{ kindId: oil, date: '2026-09-04' }]);

    await owner
      .patch(`/vehicle-deadline-kinds/${oil}`)
      .send({ label: 'Olej silnikowy' })
      .expect(200);

    expect((await notifications(owner))[0].deadlineLabel).toBe('Wymiana oleju');
    expect((await alerts(owner))[0].deadlineLabel).toBe('Olej silnikowy');
  });
});
