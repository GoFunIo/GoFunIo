import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { DataSource } from 'typeorm';
import { MembershipRole } from '../src/users/membership-role';
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

  it('creates an account without a company and activates it through first password', async () => {
    await createVerifiedUser(
      app,
      'new-invite-admin@example.com',
      'password123',
    );
    const admin = request.agent(app.getHttpServer());
    const adminSignin = await admin
      .post('/auth/signin')
      .send({ email: 'new-invite-admin@example.com', password: 'password123' })
      .expect(201);
    const database = app.get(DataSource);
    const companiesBefore = await database.query<Array<{ count: string }>>(
      `SELECT count(*) FROM "companies"`,
    );

    const events = captureEmittedEvents(app);
    try {
      await admin
        .post('/users/invitations')
        .send({ email: ' NEW-INVITEE@example.com ', role: 'MANAGER' })
        .expect(201);

      expect(events.passwordResetToken).toHaveLength(64);
      expect(events.membershipInvitationToken).toBeNull();
      const [invited] = await database.query<
        Array<{ id: string; status: string }>
      >(
        `SELECT "users"."id", "memberships"."status"
         FROM "users"
         JOIN "memberships" ON "memberships"."userId" = "users"."id"
         WHERE "users"."email" = $1`,
        ['new-invitee@example.com'],
      );
      expect(invited).toMatchObject({ status: 'pending' });
      await expect(
        database.query(`SELECT count(*) FROM "companies"`),
      ).resolves.toEqual(companiesBefore);

      await request(app.getHttpServer())
        .post('/auth/reset-password')
        .send({ token: events.passwordResetToken, password: 'new-password-99' })
        .expect(204);
      await expect(
        database.query<Array<{ status: string }>>(
          `SELECT "status" FROM "memberships" WHERE "userId" = $1`,
          [invited.id],
        ),
      ).resolves.toEqual([{ status: 'active' }]);
      await request(app.getHttpServer())
        .post('/auth/signin')
        .send({
          email: 'new-invitee@example.com',
          password: 'new-password-99',
        })
        .expect(201)
        .expect(({ body }) =>
          expect(body.companyId).toBe(adminSignin.body.companyId),
        );
    } finally {
      events.restore();
    }
  });

  it('lets normal signup claim an invited account', async () => {
    await createVerifiedUser(app, 'claim-admin@example.com', 'password123');
    const admin = request.agent(app.getHttpServer());
    const adminSignin = await admin
      .post('/auth/signin')
      .send({ email: 'claim-admin@example.com', password: 'password123' })
      .expect(201);
    const events = captureEmittedEvents(app);
    try {
      await admin
        .post('/users/invitations')
        .send({ email: 'claim-invitee@example.com', role: 'MANAGER' })
        .expect(201);
      const firstPasswordToken = events.passwordResetToken;

      await request(app.getHttpServer())
        .post('/auth/signup')
        .send({
          email: ' CLAIM-INVITEE@example.com ',
          password: 'signup-password',
        })
        .expect(201);
      expect(events.verificationToken).toHaveLength(64);
      await request(app.getHttpServer())
        .post('/auth/reset-password')
        .send({ token: firstPasswordToken, password: 'stale-password' })
        .expect(400);
      await request(app.getHttpServer())
        .get('/auth/verify-email')
        .query({ token: events.verificationToken })
        .expect(200);

      const signin = await request(app.getHttpServer())
        .post('/auth/signin')
        .send({
          email: 'claim-invitee@example.com',
          password: 'signup-password',
        })
        .expect(201);
      expect(signin.body.companyId).not.toBe(adminSignin.body.companyId);
      await expect(
        app.get(DataSource).query<Array<{ status: string }>>(
          `SELECT "status" FROM "memberships"
           WHERE "userId" = (SELECT "id" FROM "users" WHERE "email" = $1)
             AND "companyId" = $2`,
          ['claim-invitee@example.com', adminSignin.body.companyId],
        ),
      ).resolves.toEqual([{ status: 'pending' }]);
    } finally {
      events.restore();
    }
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
    const targetSignin = await target
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
    await admin
      .get('/users')
      .expect(200)
      .expect(({ body }) =>
        expect(body).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              id: targetSignin.body.id,
              role: MembershipRole.MANAGER,
            }),
          ]),
        ),
      );
    await admin
      .patch(`/users/${targetSignin.body.id}`)
      .send({ firstName: 'Updated' })
      .expect(200);
    await admin.delete(`/users/${targetSignin.body.id}`).expect(204);
    await target
      .get('/auth/me')
      .expect(200)
      .expect(({ body }) =>
        expect(body.companyId).not.toBe(adminSignin.body.companyId),
      );
  });

  it('rolls back Vehicle Access when invitation activation fails', async () => {
    await createVerifiedUser(
      app,
      'rollback-invite-admin@example.com',
      'password123',
    );
    await createVerifiedUser(
      app,
      'rollback-invite-target@example.com',
      'password123',
    );
    const admin = request.agent(app.getHttpServer());
    const target = request.agent(app.getHttpServer());
    const adminSignin = await admin
      .post('/auth/signin')
      .send({
        email: 'rollback-invite-admin@example.com',
        password: 'password123',
      })
      .expect(201);
    const targetSignin = await target
      .post('/auth/signin')
      .send({
        email: 'rollback-invite-target@example.com',
        password: 'password123',
      })
      .expect(201);
    const events = captureEmittedEvents(app);
    try {
      await admin
        .post('/users/invitations')
        .send({
          email: 'rollback-invite-target@example.com',
          role: MembershipRole.MANAGER,
        })
        .expect(201);
    } finally {
      events.restore();
    }
    const [invitation] = (await target.get('/auth/invitations').expect(200))
      .body;
    const vehicle = await admin
      .post('/vehicles')
      .send({ brand: 'Volvo', model: 'XC60', registrationNumber: 'ROLL2' })
      .expect(201);
    const database = app.get(DataSource);
    await database.query(
      `INSERT INTO "manager_vehicle_assignments"
       ("companyId", "vehicleId", "managerId") VALUES ($1, $2, $3)`,
      [adminSignin.body.companyId, vehicle.body.id, targetSignin.body.id],
    );
    await database.query(
      `ALTER TABLE "memberships"
       ADD CONSTRAINT "CK_e2e_membership_activation_failure"
       CHECK (id <> '${invitation.id}' OR status <> 'active')`,
    );

    try {
      await target
        .post(`/auth/invitations/${invitation.id}/accept`)
        .expect(500);
      await expect(
        database.query<Array<{ status: string }>>(
          `SELECT status FROM "memberships" WHERE id = $1`,
          [invitation.id],
        ),
      ).resolves.toEqual([{ status: 'pending' }]);
      await expect(
        database.query<Array<{ assignedTo: Date | null }>>(
          `SELECT "assignedTo" FROM "manager_vehicle_assignments"
           WHERE "managerId" = $1 AND "companyId" = $2`,
          [targetSignin.body.id, adminSignin.body.companyId],
        ),
      ).resolves.toEqual([{ assignedTo: null }]);
    } finally {
      await database.query(
        `ALTER TABLE "memberships"
         DROP CONSTRAINT IF EXISTS "CK_e2e_membership_activation_failure"`,
      );
    }
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
      .expect(409)
      .expect(({ body }) =>
        expect(body).toMatchObject({ code: 'ALREADY_WORKSPACE_MEMBER' }),
      );
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
