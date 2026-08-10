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

describe('Company users (e2e)', () => {
  let app: INestApplication<App>;
  let dataSource: DataSource;

  beforeAll(async () => {
    app = (await createTestApp()) as INestApplication<App>;
    dataSource = app.get(DataSource);
  });

  afterAll(async () => app.close());

  async function signedIn(email: string, password = 'password123') {
    await createVerifiedUser(app, email, password);
    const agent = request.agent(app.getHttpServer());
    await agent.post('/auth/signin').send({ email, password }).expect(201);
    return agent;
  }

  async function invite(
    agent: ReturnType<typeof request.agent>,
    email: string,
    role = MembershipRole.MANAGER,
  ) {
    const events = captureEmittedEvents(app);
    try {
      const response = await agent
        .post('/users')
        .send({ email, firstName: ' Jan ', lastName: ' Kowalski ', role })
        .expect(201);
      if (!events.passwordResetToken) {
        throw new Error('Expected set-password token');
      }
      return { user: response.body, token: events.passwordResetToken };
    } finally {
      events.restore();
    }
  }

  it('invites, lists and activates a company user', async () => {
    const admin = await signedIn('team-admin@example.com');
    const { user, token } = await invite(
      admin,
      'Manager@Example.com',
      MembershipRole.MANAGER,
    );

    expect(user).toMatchObject({
      email: 'manager@example.com',
      firstName: 'Jan',
      lastName: 'Kowalski',
      role: MembershipRole.MANAGER,
      hasPassword: false,
    });
    expect(user.password).toBeUndefined();

    await admin
      .get('/users')
      .expect(200)
      .expect((res) => {
        expect(res.body.map(({ email }: { email: string }) => email)).toEqual([
          'team-admin@example.com',
          'manager@example.com',
        ]);
      });

    await request(app.getHttpServer())
      .post('/auth/reset-password')
      .send({ token, password: 'manager-password' })
      .expect(204);
    await request(app.getHttpServer())
      .post('/auth/signin')
      .send({ email: 'manager@example.com', password: 'manager-password' })
      .expect(201);
  });

  it('denies team endpoints to MANAGER', async () => {
    const admin = await signedIn('role-admin@example.com');
    const { token } = await invite(admin, 'role-manager@example.com');
    await request(app.getHttpServer())
      .post('/auth/reset-password')
      .send({ token, password: 'manager-password' })
      .expect(204);
    const manager = request.agent(app.getHttpServer());
    await manager
      .post('/auth/signin')
      .send({ email: 'role-manager@example.com', password: 'manager-password' })
      .expect(201);

    await manager.get('/users').expect(403);
    await manager
      .post('/users')
      .send({ email: 'blocked@example.com', role: MembershipRole.MANAGER })
      .expect(403);
  });

  it('isolates companies and rejects client-owned security fields', async () => {
    const firstAdmin = await signedIn('first-admin@example.com');
    const secondAdmin = await signedIn('second-admin@example.com');
    const { user: member } = await invite(
      firstAdmin,
      'first-member@example.com',
    );

    await secondAdmin
      .patch(`/users/${member.id}`)
      .send({ firstName: 'Stolen' })
      .expect(404);
    await secondAdmin.delete(`/users/${member.id}`).expect(404);
    await secondAdmin
      .post('/users')
      .send({
        email: 'invalid@example.com',
        role: MembershipRole.MANAGER,
        companyId: member.companyId,
      })
      .expect(400);
    await secondAdmin
      .get('/users')
      .expect(200)
      .expect((res) => {
        expect(res.body).toHaveLength(1);
        expect(res.body[0].email).toBe('second-admin@example.com');
      });
  });

  it('updates members but blocks self-demotion and duplicate email', async () => {
    const admin = await signedIn('update-admin@example.com');
    const me = await admin.get('/auth/me').expect(200);
    const { user } = await invite(admin, 'update-member@example.com');

    await admin
      .patch(`/users/${user.id}`)
      .send({ firstName: 'Anna', role: MembershipRole.ADMIN })
      .expect(200)
      .expect((res) => {
        expect(res.body).toMatchObject({
          firstName: 'Anna',
          role: MembershipRole.ADMIN,
        });
      });
    await admin
      .patch(`/users/${me.body.id}`)
      .send({ role: MembershipRole.MANAGER })
      .expect(409);
    await admin
      .post('/users')
      .send({
        email: 'UPDATE-MEMBER@example.com',
        role: MembershipRole.MANAGER,
      })
      .expect(409);
  });

  it('serializes concurrent email claims', async () => {
    const admin = await signedIn('claim-admin@example.com');
    const { token } = await invite(admin, 'claim-manager@example.com');
    await request(app.getHttpServer())
      .post('/auth/reset-password')
      .send({ token, password: 'manager-password' })
      .expect(204);
    const manager = request.agent(app.getHttpServer());
    await manager
      .post('/auth/signin')
      .send({
        email: 'claim-manager@example.com',
        password: 'manager-password',
      })
      .expect(201);

    const [inviteResponse, changeResponse] = await Promise.all([
      admin
        .post('/users')
        .send({ email: 'claimed@example.com', role: MembershipRole.MANAGER }),
      manager.patch('/users/me/email').send({
        email: 'claimed@example.com',
        currentPassword: 'manager-password',
      }),
    ]);
    expect([inviteResponse.status, changeResponse.status].sort()).toEqual([
      201, 409,
    ]);
  });

  it('removes only the membership and keeps a zero-workspace user active', async () => {
    const admin = await signedIn('delete-admin@example.com');
    const { user, token } = await invite(admin, 'deleted-member@example.com');
    await request(app.getHttpServer())
      .post('/auth/reset-password')
      .send({ token, password: 'manager-password' })
      .expect(204);
    const member = request.agent(app.getHttpServer());
    await member
      .post('/auth/signin')
      .send({
        email: 'deleted-member@example.com',
        password: 'manager-password',
      })
      .expect(201);
    await member
      .patch('/users/me/email')
      .send({
        email: 'released-pending@example.com',
        currentPassword: 'manager-password',
      })
      .expect(204);

    await admin.delete(`/users/${user.id}`).expect(204);
    await member
      .get('/auth/me')
      .expect(200)
      .expect(({ body }) => {
        expect(body.companyId).toBeNull();
        expect(body.role).toBeNull();
      });
    await member.get('/auth/companies').expect(200, []);
    const [stored] = await dataSource.query<
      Array<{ deletedAt: Date | null; status: string }>
    >(
      `SELECT user_account."deletedAt", membership.status
       FROM "users" user_account
       JOIN "memberships" membership ON membership."userId" = user_account.id
       WHERE user_account.id = $1`,
      [user.id],
    );
    expect(stored.deletedAt).toBeNull();
    expect(stored.status).toBe('removed');

    await member
      .post('/companies')
      .send({ name: 'Member workspace' })
      .expect(201);
    await admin
      .get('/users')
      .expect(200)
      .expect((res) => {
        expect(
          res.body.some(
            ({ email }: { email: string }) =>
              email === 'deleted-member@example.com',
          ),
        ).toBe(false);
      });
  });

  it('allows a manager to leave but blocks the sole admin', async () => {
    const admin = await signedIn('leave-admin@example.com');
    const { token } = await invite(admin, 'leave-manager@example.com');
    await request(app.getHttpServer())
      .post('/auth/reset-password')
      .send({ token, password: 'manager-password' })
      .expect(204);
    const manager = request.agent(app.getHttpServer());
    await manager
      .post('/auth/signin')
      .send({
        email: 'leave-manager@example.com',
        password: 'manager-password',
      })
      .expect(201);

    await admin.delete('/users/me').expect(409);
    await manager.delete('/users/me').expect(204);
    await manager
      .get('/auth/me')
      .expect(200)
      .expect(({ body }) => expect(body.companyId).toBeNull());
  });

  it('soft-deletes a workspace after its last membership leaves', async () => {
    const manager = await signedIn('last-member@example.com');
    const me = await manager.get('/auth/me').expect(200);
    const [{ id: companyId }] = await dataSource.query<Array<{ id: string }>>(
      `INSERT INTO "companies" (name) VALUES ('Temporary workspace') RETURNING id`,
    );
    await dataSource.query(
      `INSERT INTO "memberships" ("userId", "companyId", role, status)
       VALUES ($1, $2, 'MANAGER', 'active')`,
      [me.body.id, companyId],
    );
    await manager.post('/auth/switch-company').send({ companyId }).expect(204);

    await manager.delete('/users/me').expect(204);
    const [company] = await dataSource.query<Array<{ deletedAt: Date | null }>>(
      `SELECT "deletedAt" FROM "companies" WHERE id = $1`,
      [companyId],
    );
    const [membership] = await dataSource.query<Array<{ status: string }>>(
      `SELECT status FROM "memberships" WHERE "userId" = $1 AND "companyId" = $2`,
      [me.body.id, companyId],
    );
    expect(company.deletedAt).not.toBeNull();
    expect(membership.status).toBe('removed');
    await manager
      .get('/auth/me')
      .expect(200)
      .expect(({ body }) => expect(body.companyId).toBeNull());
    await manager
      .post('/auth/switch-company')
      .send({ companyId: me.body.companyId })
      .expect(204);
  });
});
