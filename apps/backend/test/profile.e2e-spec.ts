import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { DataSource } from 'typeorm';
import { createTestApp } from './helpers/create-test-app';
import {
  captureEmittedEvents,
  createVerifiedUser,
} from './helpers/auth-test-utils';

describe('Profile and company (e2e)', () => {
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

  it('updates current profile and rejects ownership fields', async () => {
    const agent = await signedIn('profile@example.com');

    await agent
      .patch('/users/me')
      .send({ firstName: ' Jan ', postalCode: '00-001', city: ' Warszawa ' })
      .expect(200)
      .expect((res) => {
        expect(res.body).toMatchObject({
          firstName: 'Jan',
          postalCode: '00-001',
          city: 'Warszawa',
        });
      });
    await agent.patch('/users/me').send({ role: 'ADMIN' }).expect(400);
  });

  it('changes password and keeps current session valid', async () => {
    const agent = await signedIn('password-change@example.com');
    const events = captureEmittedEvents(app);

    try {
      await request(app.getHttpServer())
        .post('/auth/forgot-password')
        .send({ email: 'password-change@example.com' })
        .expect(204);
      await agent
        .patch('/users/me/password')
        .send({ currentPassword: 'password123', newPassword: 'new-password' })
        .expect(204);
      await agent.get('/auth/me').expect(200);
      await request(app.getHttpServer())
        .post('/auth/reset-password')
        .send({ token: events.passwordResetToken, password: 'stolen-password' })
        .expect(400);
      await request(app.getHttpServer())
        .post('/auth/signin')
        .send({
          email: 'password-change@example.com',
          password: 'new-password',
        })
        .expect(201);
    } finally {
      events.restore();
    }
  });

  it('changes email only after verification', async () => {
    const agent = await signedIn('old-email@example.com');
    const events = captureEmittedEvents(app);

    try {
      await agent
        .patch('/users/me/email')
        .send({
          email: 'New-Email@Example.com',
          currentPassword: 'password123',
        })
        .expect(204);
      await agent
        .get('/auth/me')
        .expect(200)
        .expect((res) => {
          expect(res.body.email).toBe('old-email@example.com');
          expect(res.body.pendingEmail).toBe('new-email@example.com');
        });
      await request(app.getHttpServer())
        .post('/auth/verify-email-change')
        .send({ token: events.emailChangeToken })
        .expect(200);
      await request(app.getHttpServer())
        .post('/auth/signin')
        .send({ email: 'new-email@example.com', password: 'password123' })
        .expect(201);
    } finally {
      events.restore();
    }
  });

  it('releases an expired email-change claim', async () => {
    const first = await signedIn('first-claim@example.com');
    const second = await signedIn('second-claim@example.com');

    await first
      .patch('/users/me/email')
      .send({ email: 'claim@example.com', currentPassword: 'password123' })
      .expect(204);
    await app.get(DataSource).query(
      `UPDATE "users" SET "emailChangeTokenExpiresAt" = now() - interval '1 minute'
       WHERE "pendingEmail" = $1`,
      ['claim@example.com'],
    );
    await second
      .patch('/users/me/email')
      .send({ email: 'claim@example.com', currentPassword: 'password123' })
      .expect(204);
  });

  it('allows ADMIN and rejects MANAGER company updates', async () => {
    const email = 'company@example.com';
    const agent = await signedIn(email);

    await agent
      .patch('/company')
      .send({ name: 'Firma', taxId: '123-456-78-90', postalCode: '00-001' })
      .expect(200)
      .expect((res) => expect(res.body.taxId).toBe('1234567890'));
    await agent.patch('/company').send({ name: null }).expect(400);
    await app.get(DataSource).query(
      `UPDATE "memberships" SET "role" = 'MANAGER'
       WHERE "userId" = (SELECT "id" FROM "users" WHERE "email" = $1)`,
      [email],
    );
    await agent.patch('/company').send({ name: 'Nope' }).expect(403);
    await agent.get('/company').expect(200);
  });
});
