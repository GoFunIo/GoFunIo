import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { UserRole } from '../src/users/users.entity';
import {
  captureEmittedEvents,
  createVerifiedUser,
} from './helpers/auth-test-utils';
import { createTestApp } from './helpers/create-test-app';

describe('Company users (e2e)', () => {
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

  async function invite(
    agent: ReturnType<typeof request.agent>,
    email: string,
    role = UserRole.MANAGER,
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
      UserRole.MANAGER,
    );

    expect(user).toMatchObject({
      email: 'manager@example.com',
      firstName: 'Jan',
      lastName: 'Kowalski',
      role: UserRole.MANAGER,
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
      .send({ email: 'blocked@example.com', role: UserRole.MANAGER })
      .expect(403);
  });

  it('isolates companies and rejects client-owned security fields', async () => {
    const firstAdmin = await signedIn('first-admin@example.com');
    const secondAdmin = await signedIn('second-admin@example.com');
    const { user } = await invite(firstAdmin, 'first-member@example.com');

    await secondAdmin
      .patch(`/users/${user.id}`)
      .send({ firstName: 'Stolen' })
      .expect(404);
    await secondAdmin.delete(`/users/${user.id}`).expect(404);
    await secondAdmin
      .post('/users')
      .send({
        email: 'invalid@example.com',
        role: UserRole.MANAGER,
        companyId: user.companyId,
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
      .send({ firstName: 'Anna', role: UserRole.ADMIN })
      .expect(200)
      .expect((res) => {
        expect(res.body).toMatchObject({
          firstName: 'Anna',
          role: UserRole.ADMIN,
        });
      });
    await admin
      .patch(`/users/${me.body.id}`)
      .send({ role: UserRole.MANAGER })
      .expect(409);
    await admin
      .post('/users')
      .send({ email: 'UPDATE-MEMBER@example.com', role: UserRole.MANAGER })
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
        .send({ email: 'claimed@example.com', role: UserRole.MANAGER }),
      manager.patch('/users/me/email').send({
        email: 'claimed@example.com',
        currentPassword: 'manager-password',
      }),
    ]);
    expect([inviteResponse.status, changeResponse.status].sort()).toEqual([
      201, 409,
    ]);
  });

  it('soft-deletes a member and invalidates their session', async () => {
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
    await member.get('/auth/me').expect(401);
    await invite(admin, 'released-pending@example.com');
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
});
