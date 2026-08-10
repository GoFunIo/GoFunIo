import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { DataSource } from 'typeorm';
import {
  captureEmittedEvents,
  createVerifiedUser,
} from './helpers/auth-test-utils';
import { createTestApp } from './helpers/create-test-app';

describe('Membership invitations (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    app = (await createTestApp()) as INestApplication<App>;
  });

  afterAll(async () => app.close());

  it('lets an admin invite an existing account into the active workspace', async () => {
    await createVerifiedUser(app, 'invite-admin@example.com', 'password123');
    await createVerifiedUser(app, 'invite-target@example.com', 'password123');
    const admin = request.agent(app.getHttpServer());
    const target = request.agent(app.getHttpServer());

    const adminSignin = await admin
      .post('/auth/signin')
      .send({ email: 'invite-admin@example.com', password: 'password123' })
      .expect(201);
    await target
      .post('/auth/signin')
      .send({ email: 'invite-target@example.com', password: 'password123' })
      .expect(201);

    const events = captureEmittedEvents(app);
    try {
      await admin
        .post('/users/invitations')
        .send({ email: ' INVITE-TARGET@example.com ', role: 'MANAGER' })
        .expect(201);
      expect(events.membershipInvitationToken).toHaveLength(64);
    } finally {
      events.restore();
    }

    await target
      .get('/auth/invitations')
      .expect(200)
      .expect(({ body }) => {
        expect(body).toEqual([
          expect.objectContaining({
            companyId: adminSignin.body.companyId,
            role: 'MANAGER',
            status: 'pending',
          }),
        ]);
      });
    await target
      .get('/auth/companies')
      .expect(200)
      .expect(({ body }) => expect(body).toHaveLength(1));
  });

  it('accepts a valid link only for the invited signed-in account', async () => {
    await createVerifiedUser(app, 'accept-admin@example.com', 'password123');
    await createVerifiedUser(app, 'accept-target@example.com', 'password123');
    await createVerifiedUser(app, 'accept-other@example.com', 'password123');
    const admin = request.agent(app.getHttpServer());
    const target = request.agent(app.getHttpServer());
    const other = request.agent(app.getHttpServer());

    const adminSignin = await admin
      .post('/auth/signin')
      .send({ email: 'accept-admin@example.com', password: 'password123' })
      .expect(201);
    await target
      .post('/auth/signin')
      .send({ email: 'accept-target@example.com', password: 'password123' })
      .expect(201);
    await other
      .post('/auth/signin')
      .send({ email: 'accept-other@example.com', password: 'password123' })
      .expect(201);

    const events = captureEmittedEvents(app);
    try {
      await admin
        .post('/users/invitations')
        .send({ email: 'accept-target@example.com', role: 'MANAGER' })
        .expect(201);
      const token = events.membershipInvitationToken!;

      await request(app.getHttpServer())
        .post('/auth/invitations/accept')
        .send({ token })
        .expect(401);
      await other.post('/auth/invitations/accept').send({ token }).expect(400);
      await target.post('/auth/invitations/accept').send({ token }).expect(204);
    } finally {
      events.restore();
    }

    await target
      .get('/auth/companies')
      .expect(200)
      .expect(({ body }) =>
        expect(body).toEqual(
          expect.arrayContaining([
            expect.objectContaining({ id: adminSignin.body.companyId }),
          ]),
        ),
      );
    await target
      .post('/auth/switch-company')
      .send({ companyId: adminSignin.body.companyId })
      .expect(204);
    await target
      .post('/users/invitations')
      .send({ email: 'accept-other@example.com', role: 'MANAGER' })
      .expect(403);
  });

  it('declines in-app and permits a fresh invitation', async () => {
    await createVerifiedUser(app, 'decline-admin@example.com', 'password123');
    await createVerifiedUser(app, 'decline-target@example.com', 'password123');
    const admin = request.agent(app.getHttpServer());
    const target = request.agent(app.getHttpServer());
    await admin
      .post('/auth/signin')
      .send({ email: 'decline-admin@example.com', password: 'password123' })
      .expect(201);
    await target
      .post('/auth/signin')
      .send({ email: 'decline-target@example.com', password: 'password123' })
      .expect(201);

    await admin
      .post('/users/invitations')
      .send({ email: 'decline-target@example.com', role: 'MANAGER' })
      .expect(201);
    const invitation = await target.get('/auth/invitations').expect(200);

    await target
      .post(`/auth/invitations/${invitation.body[0].id}/decline`)
      .expect(204);
    await target
      .get('/auth/invitations')
      .expect(200)
      .expect(({ body }) => expect(body).toEqual([]));

    await admin
      .post('/users/invitations')
      .send({ email: 'decline-target@example.com', role: 'ADMIN' })
      .expect(201);
    const reinvited = await target
      .get('/auth/invitations')
      .expect(200)
      .expect(({ body }) => {
        expect(body).toHaveLength(1);
        expect(body[0]).toMatchObject({ role: 'ADMIN', status: 'pending' });
      });
    await target
      .post(`/auth/invitations/${reinvited.body[0].id}/accept`)
      .expect(204);
    await admin
      .post('/users/invitations')
      .send({ email: 'decline-target@example.com', role: 'MANAGER' })
      .expect(409);
  });

  it('invalidates the previous token when resending', async () => {
    await createVerifiedUser(app, 'resend-admin@example.com', 'password123');
    await createVerifiedUser(app, 'resend-target@example.com', 'password123');
    const admin = request.agent(app.getHttpServer());
    const target = request.agent(app.getHttpServer());
    await admin
      .post('/auth/signin')
      .send({ email: 'resend-admin@example.com', password: 'password123' })
      .expect(201);
    await target
      .post('/auth/signin')
      .send({ email: 'resend-target@example.com', password: 'password123' })
      .expect(201);

    const firstEvents = captureEmittedEvents(app);
    await admin
      .post('/users/invitations')
      .send({ email: 'resend-target@example.com', role: 'MANAGER' })
      .expect(201);
    const firstToken = firstEvents.membershipInvitationToken!;
    firstEvents.restore();

    const secondEvents = captureEmittedEvents(app);
    try {
      await admin
        .post('/users/invitations')
        .send({ email: 'resend-target@example.com', role: 'MANAGER' })
        .expect(201);
      const secondToken = secondEvents.membershipInvitationToken!;
      expect(secondToken).not.toBe(firstToken);
      await target
        .post('/auth/invitations/accept')
        .send({ token: firstToken })
        .expect(400);
      await target
        .post('/auth/invitations/accept')
        .send({ token: secondToken })
        .expect(204);
    } finally {
      secondEvents.restore();
    }
  });

  it('rejects a token after its seven-day expiry', async () => {
    await createVerifiedUser(app, 'expiry-admin@example.com', 'password123');
    await createVerifiedUser(app, 'expiry-target@example.com', 'password123');
    const admin = request.agent(app.getHttpServer());
    const target = request.agent(app.getHttpServer());
    await admin
      .post('/auth/signin')
      .send({ email: 'expiry-admin@example.com', password: 'password123' })
      .expect(201);
    await target
      .post('/auth/signin')
      .send({ email: 'expiry-target@example.com', password: 'password123' })
      .expect(201);

    const events = captureEmittedEvents(app);
    try {
      const invitedAt = Date.now();
      await admin
        .post('/users/invitations')
        .send({ email: 'expiry-target@example.com', role: 'MANAGER' })
        .expect(201);
      const pending = await target.get('/auth/invitations').expect(200);
      expect(
        new Date(pending.body[0].expiresAt).getTime() - invitedAt,
      ).toBeCloseTo(7 * 24 * 60 * 60 * 1000, -4);

      await app
        .get(DataSource)
        .query(
          `UPDATE "memberships" SET "tokenExpiresAt" = now() - interval '1 hour' WHERE "id" = $1`,
          [pending.body[0].id],
        );
      await target
        .post('/auth/invitations/accept')
        .send({ token: events.membershipInvitationToken })
        .expect(400);
    } finally {
      events.restore();
    }
  });
});
