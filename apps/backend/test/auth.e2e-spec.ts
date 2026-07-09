import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { createTestApp } from './helpers/create-test-app';
import {
  type CapturedEvents,
  captureEmittedEvents,
  createVerifiedUser,
} from './helpers/auth-test-utils';

describe('Auth (e2e)', () => {
  let app: INestApplication<App>;
  let activeEvents: CapturedEvents | null = null;

  beforeAll(async () => {
    app = (await createTestApp()) as INestApplication<App>;
  });

  afterEach(() => {
    activeEvents?.restore();
    activeEvents = null;
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  function trackEvents(): CapturedEvents {
    activeEvents = captureEmittedEvents(app);
    return activeEvents;
  }

  it('signup → verify → signin → me returns user without password', async () => {
    const email = 'flow@example.com';
    const password = 'password123';
    const events = trackEvents();

    await request(app.getHttpServer())
      .post('/auth/signup')
      .send({ email, password })
      .expect(201);

    const token = events.verificationToken;
    expect(token).toBeTruthy();

    await request(app.getHttpServer())
      .get('/auth/verify-email')
      .query({ token })
      .expect(200)
      .expect({ verified: true });

    const agent = request.agent(app.getHttpServer());

    await agent.post('/auth/signin').send({ email, password }).expect(201);

    const me = await agent.get('/auth/me').expect(200);

    expect(me.body).toMatchObject({
      email,
      role: 'ADMIN',
    });
    expect(me.body.password).toBeUndefined();
    expect(me.body.id).toBeDefined();
    expect(me.body.companyId).toBeDefined();
  });

  it('signin rejects unverified email with 401', async () => {
    const email = 'unverified@example.com';
    const password = 'password123';

    trackEvents();

    await request(app.getHttpServer())
      .post('/auth/signup')
      .send({ email, password })
      .expect(201);

    await request(app.getHttpServer())
      .post('/auth/signin')
      .send({ email, password })
      .expect(401)
      .expect((res) => {
        expect(res.body.message).toBe('Email not verified');
      });
  });

  it('signin rejects wrong password with 401', async () => {
    const email = 'wrong-pass@example.com';
    const password = 'password123';
    await createVerifiedUser(app, email, password);

    await request(app.getHttpServer())
      .post('/auth/signin')
      .send({ email, password: 'wrong-password' })
      .expect(401)
      .expect((res) => {
        expect(res.body.message).toBe('Invalid credentials');
      });
  });

  it('signup rejects duplicate email with 400', async () => {
    const email = 'dup@example.com';
    const password = 'password123';

    trackEvents();

    await request(app.getHttpServer())
      .post('/auth/signup')
      .send({ email, password })
      .expect(201);

    await request(app.getHttpServer())
      .post('/auth/signup')
      .send({ email, password })
      .expect(400)
      .expect((res) => {
        expect(res.body.message).toBe('Email already in use');
      });
  });

  it('verify-email rejects unknown token with 400', async () => {
    const unknownToken = 'a'.repeat(64);

    await request(app.getHttpServer())
      .get('/auth/verify-email')
      .query({ token: unknownToken })
      .expect(400)
      .expect((res) => {
        expect(res.body.message).toBe('Invalid or expired token');
      });
  });

  it('forgot-password → reset → signin with new password works', async () => {
    const email = 'reset@example.com';
    const oldPassword = 'old-password';
    const newPassword = 'new-password-99';
    await createVerifiedUser(app, email, oldPassword);

    const agent = request.agent(app.getHttpServer());
    await agent
      .post('/auth/signin')
      .send({ email, password: oldPassword })
      .expect(201);

    const events = trackEvents();
    await request(app.getHttpServer())
      .post('/auth/forgot-password')
      .send({ email })
      .expect(204);

    const resetToken = events.passwordResetToken;
    expect(resetToken).toBeTruthy();

    await request(app.getHttpServer())
      .post('/auth/reset-password')
      .send({ token: resetToken, password: newPassword })
      .expect(204);

    await request(app.getHttpServer())
      .post('/auth/signin')
      .send({ email, password: oldPassword })
      .expect(401);

    await request(app.getHttpServer())
      .post('/auth/signin')
      .send({ email, password: newPassword })
      .expect(201);
  });

  it('password reset invalidates existing session on /auth/me', async () => {
    const email = 'session@example.com';
    const oldPassword = 'old-password';
    const newPassword = 'new-password-99';
    await createVerifiedUser(app, email, oldPassword);

    const agent = request.agent(app.getHttpServer());
    await agent
      .post('/auth/signin')
      .send({ email, password: oldPassword })
      .expect(201);
    await agent.get('/auth/me').expect(200);

    const events = trackEvents();
    await request(app.getHttpServer())
      .post('/auth/forgot-password')
      .send({ email })
      .expect(204);

    await request(app.getHttpServer())
      .post('/auth/reset-password')
      .send({ token: events.passwordResetToken!, password: newPassword })
      .expect(204);

    const me = await agent.get('/auth/me');
    expect(me.body.id).toBeUndefined();
    expect(me.body.email).toBeUndefined();
  });

  it('signout clears session so /auth/me has no user', async () => {
    const email = 'signout@example.com';
    const password = 'password123';
    await createVerifiedUser(app, email, password);

    const agent = request.agent(app.getHttpServer());
    await agent.post('/auth/signin').send({ email, password }).expect(201);
    await agent.get('/auth/me').expect(200);

    await agent.post('/auth/signout').expect(201);

    const me = await agent.get('/auth/me');
    expect(me.body.id).toBeUndefined();
    expect(me.body.email).toBeUndefined();
  });

  it('signup rejects invalid email with 400', async () => {
    await request(app.getHttpServer())
      .post('/auth/signup')
      .send({ email: 'not-an-email', password: 'password123' })
      .expect(400);
  });
});
