import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { DataSource } from 'typeorm';
import { createTestApp } from './helpers/create-test-app';
import { User } from '../src/users/users.entity';
import {
  type CapturedEvents,
  captureEmittedEvents,
  createVerifiedUser,
  buildGoogleVerifyResult,
} from './helpers/auth-test-utils';

const mockVerifyIdToken = jest.fn();

jest.mock('google-auth-library', () => ({
  OAuth2Client: jest.fn().mockImplementation(() => ({
    verifyIdToken: mockVerifyIdToken,
  })),
}));

describe('Auth (e2e)', () => {
  let app: INestApplication<App>;
  let activeEvents: CapturedEvents | null = null;

  beforeAll(async () => {
    app = (await createTestApp()) as INestApplication<App>;
  });

  afterEach(() => {
    activeEvents?.restore();
    activeEvents = null;
    mockVerifyIdToken.mockReset();
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

  it('signup → verify → me returns the logged-in user without password', async () => {
    const email = 'flow@example.com';
    const password = 'Password123!';
    const events = trackEvents();
    const agent = request.agent(app.getHttpServer());

    await agent.post('/auth/signup').send({ email, password }).expect(201);

    const token = events.verificationToken;
    expect(token).toBeTruthy();

    await agent
      .get('/auth/verify-email')
      .query({ token })
      .expect(200)
      .expect({ verified: true });

    const me = await agent.get('/auth/me').expect(200);

    expect(me.body).toMatchObject({
      email,
      role: 'OWNER',
      hasPassword: true,
    });
    expect(me.body.password).toBeUndefined();
    expect(me.body.id).toBeDefined();
    expect(me.body.companyId).toBeDefined();
  });

  it('signin rejects unverified email with 401', async () => {
    const email = 'unverified@example.com';
    const password = 'Password123!';

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

  it('password reset does not verify a regular signup email', async () => {
    const email = 'unverified-reset@example.com';
    const events = trackEvents();

    await request(app.getHttpServer())
      .post('/auth/signup')
      .send({ email, password: 'Password123!' })
      .expect(201);
    await request(app.getHttpServer())
      .post('/auth/forgot-password')
      .send({ email })
      .expect(204);
    await request(app.getHttpServer())
      .post('/auth/reset-password')
      .send({ token: events.passwordResetToken, password: 'New-password1!' })
      .expect(204);
    await request(app.getHttpServer())
      .post('/auth/signin')
      .send({ email, password: 'New-password1!' })
      .expect(401)
      .expect((res) => {
        expect(res.body.message).toBe('Email not verified');
      });
  });

  it('normalizes email for signup and signin', async () => {
    const password = 'Password123!';
    const events = trackEvents();

    await request(app.getHttpServer())
      .post('/auth/signup')
      .send({ email: ' User@Example.com ', password })
      .expect(201)
      .expect((res) => expect(res.body.email).toBe('user@example.com'));

    await request(app.getHttpServer())
      .get('/auth/verify-email')
      .query({ token: events.verificationToken })
      .expect(200);

    await request(app.getHttpServer())
      .post('/auth/signin')
      .send({ email: 'USER@EXAMPLE.COM', password })
      .expect(201);
  });

  it('applies the password policy during signup', async () => {
    await request(app.getHttpServer())
      .post('/auth/signup')
      .send({ email: 'invalid-password@example.com', password: 'NoSpecial1' })
      .expect(400);
  });

  it('signin rejects wrong password with 401', async () => {
    const email = 'wrong-pass@example.com';
    const password = 'Password123!';
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
    const password = 'Password123!';

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

  it('does not reuse email after soft delete', async () => {
    const email = 'deleted@example.com';
    const password = 'Password123!';
    trackEvents();

    await request(app.getHttpServer())
      .post('/auth/signup')
      .send({ email, password })
      .expect(201);
    await app
      .get(DataSource)
      .query(`UPDATE "users" SET "deletedAt" = now() WHERE "email" = $1`, [
        email,
      ]);

    await request(app.getHttpServer())
      .post('/auth/signup')
      .send({ email, password })
      .expect(400);
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

  it('resends verification by rotating the expired current token', async () => {
    const email = 'resend-verification@example.com';
    const events = trackEvents();

    await request(app.getHttpServer())
      .post('/auth/signup')
      .send({ email, password: 'Password123!' })
      .expect(201);
    const expiredToken = events.verificationToken;
    expect(expiredToken).toBeTruthy();

    await app
      .get(DataSource)
      .query(
        `UPDATE "users" SET "verificationTokenExpiresAt" = now() - interval '1 minute' WHERE email = $1`,
        [email],
      );

    await request(app.getHttpServer())
      .post('/auth/resend-verification')
      .send({ token: expiredToken })
      .expect(204);
    const newToken = events.verificationToken;
    expect(newToken).toBeTruthy();
    expect(newToken).not.toBe(expiredToken);

    await request(app.getHttpServer())
      .get('/auth/verify-email')
      .query({ token: expiredToken })
      .expect(400);
    await request(app.getHttpServer())
      .get('/auth/verify-email')
      .query({ token: newToken })
      .expect(200);
  });

  it('resend-verification is silent for unknown tokens and rejects the old email contract', async () => {
    const events = trackEvents();

    await request(app.getHttpServer())
      .post('/auth/resend-verification')
      .send({ token: 'a'.repeat(64) })
      .expect(204);
    expect(events.verificationToken).toBeNull();

    await request(app.getHttpServer())
      .post('/auth/resend-verification')
      .send({ email: 'user@example.com' })
      .expect(400);
    await request(app.getHttpServer())
      .post('/auth/resend-verification')
      .send({ token: 'not-a-token' })
      .expect(400);
  });

  it('consumed verification token does not establish another session', async () => {
    const events = trackEvents();
    await request(app.getHttpServer())
      .post('/auth/signup')
      .send({ email: 'consumed@example.com', password: 'Password123!' })
      .expect(201);

    const token = events.verificationToken;
    expect(token).toBeTruthy();
    await request(app.getHttpServer())
      .get('/auth/verify-email')
      .query({ token })
      .expect(200);

    const agent = request.agent(app.getHttpServer());
    await agent.get('/auth/verify-email').query({ token }).expect(400);
    await agent.get('/auth/me').expect(401);
  });

  it('forgot-password → reset → signin with new password works', async () => {
    const email = 'reset@example.com';
    const oldPassword = 'Old-password1!';
    const newPassword = 'New-password99!';
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

  it('forgot-password does not reveal whether an email exists', async () => {
    await createVerifiedUser(app, 'known@example.com', 'Password123!');

    await request(app.getHttpServer())
      .post('/auth/forgot-password')
      .send({ email: 'known@example.com' })
      .expect(204);
    await request(app.getHttpServer())
      .post('/auth/forgot-password')
      .send({ email: 'missing@example.com' })
      .expect(204);
  });

  it('reset-password maps invalid tokens to the stable error', async () => {
    await request(app.getHttpServer())
      .post('/auth/reset-password')
      .send({ token: 'a'.repeat(64), password: 'New-password99!' })
      .expect(400)
      .expect((res) => {
        expect(res.body.message).toBe('Invalid or expired token');
      });
  });

  it('applies the password policy during reset', async () => {
    const email = 'reset-password-policy@example.com';
    await createVerifiedUser(app, email, 'Password123!');
    const events = trackEvents();
    await request(app.getHttpServer())
      .post('/auth/forgot-password')
      .send({ email })
      .expect(204);

    await request(app.getHttpServer())
      .post('/auth/reset-password')
      .send({ token: events.passwordResetToken, password: 'lowercase1!' })
      .expect(400);
  });

  it('password reset invalidates existing session on /auth/me', async () => {
    const email = 'session@example.com';
    const oldPassword = 'Old-password1!';
    const newPassword = 'New-password99!';
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

    await agent.get('/auth/me').expect(401);
  });

  it('signout clears session so /auth/me has no user', async () => {
    const email = 'signout@example.com';
    const password = 'Password123!';
    await createVerifiedUser(app, email, password);

    const agent = request.agent(app.getHttpServer());
    await agent.post('/auth/signin').send({ email, password }).expect(201);
    await agent.get('/auth/me').expect(200);

    await agent.post('/auth/signout').expect(204);

    await agent.get('/auth/me').expect(401);
  });

  it('rejects /auth/me without a session', async () => {
    await request(app.getHttpServer()).get('/auth/me').expect(401);
  });

  it('keeps the account authenticated when its company is soft-deleted', async () => {
    const email = 'deleted-company@example.com';
    const password = 'Password123!';
    await createVerifiedUser(app, email, password);

    const agent = request.agent(app.getHttpServer());
    await agent.post('/auth/signin').send({ email, password }).expect(201);

    await app.get(DataSource).query(
      `UPDATE "companies" SET "deletedAt" = now()
       WHERE "id" = (
         SELECT membership."companyId"
         FROM "memberships" membership
         JOIN "users" user_account ON user_account.id = membership."userId"
         WHERE user_account.email = $1 AND membership.status = 'active'
         ORDER BY membership."createdAt", membership.id
         LIMIT 1
       )`,
      [email],
    );

    await agent
      .get('/auth/me')
      .expect(200)
      .expect(({ body }) => {
        expect(body.companyId).toBeNull();
        expect(body.role).toBeNull();
      });
    await request(app.getHttpServer())
      .post('/auth/signin')
      .send({ email, password })
      .expect(201)
      .expect(({ body }) => {
        expect(body.companyId).toBeNull();
        expect(body.role).toBeNull();
      });
  });

  it('signup rejects invalid email with 400', async () => {
    await request(app.getHttpServer())
      .post('/auth/signup')
      .send({ email: 'not-an-email', password: 'Password123!' })
      .expect(400);
  });

  it('google signin creates user and /auth/me works', async () => {
    mockVerifyIdToken.mockResolvedValueOnce(
      buildGoogleVerifyResult({
        sub: 'google-new-user',
        email: 'new-google@example.com',
      }),
    );

    const agent = request.agent(app.getHttpServer());
    const signin = await agent
      .post('/auth/google')
      .send({ credential: 'valid-google-token' })
      .expect(201);

    expect(signin.body).toMatchObject({
      email: 'new-google@example.com',
      role: 'OWNER',
    });
    expect(signin.body.password).toBeUndefined();

    const me = await agent.get('/auth/me').expect(200);
    expect(me.body.email).toBe('new-google@example.com');
    expect(me.body.hasPassword).toBe(false);
  });

  it('google signin is idempotent for same googleId', async () => {
    mockVerifyIdToken.mockResolvedValueOnce(
      buildGoogleVerifyResult({
        sub: 'google-repeat-user',
        email: 'repeat-google@example.com',
      }),
    );

    const agent = request.agent(app.getHttpServer());
    const first = await agent
      .post('/auth/google')
      .send({ credential: 'valid-google-token' })
      .expect(201);

    mockVerifyIdToken.mockResolvedValueOnce(
      buildGoogleVerifyResult({
        sub: 'google-repeat-user',
        email: 'repeat-google@example.com',
      }),
    );

    const second = await agent
      .post('/auth/google')
      .send({ credential: 'valid-google-token' })
      .expect(201);

    expect(second.body.id).toBe(first.body.id);
  });

  it('google signin auto-links verified Gmail account', async () => {
    const email = 'link-google@gmail.com';
    const password = 'Password123!';
    await createVerifiedUser(app, email, password);

    mockVerifyIdToken.mockResolvedValueOnce(
      buildGoogleVerifyResult({
        sub: 'google-link-user',
        email,
      }),
    );

    const agent = request.agent(app.getHttpServer());
    await agent
      .post('/auth/google')
      .send({ credential: 'valid-google-token' })
      .expect(201);

    await agent
      .get('/auth/me')
      .expect(200)
      .expect((res) => {
        expect(res.body.email).toBe(email);
      });
  });

  it('explicitly links a non-authoritative Google identity', async () => {
    const email = 'explicit-google@example.com';
    const password = 'Password123!';
    await createVerifiedUser(app, email, password);
    const agent = request.agent(app.getHttpServer());
    await agent.post('/auth/signin').send({ email, password }).expect(201);
    mockVerifyIdToken.mockResolvedValueOnce(
      buildGoogleVerifyResult({ sub: 'google-explicit-user', email }),
    );

    await agent
      .post('/auth/google/link')
      .set('Origin', 'http://localhost:5173')
      .send({ credential: 'valid-google-token', password })
      .expect(201)
      .expect((res) => {
        expect(res.body.email).toBe(email);
      });

    await expect(
      app.get(DataSource).getRepository(User).findOneByOrFail({ email }),
    ).resolves.toMatchObject({ googleId: 'google-explicit-user' });
  });

  it('google signin rejects unverified email account with 409', async () => {
    const email = 'unverified-google@example.com';
    const password = 'Password123!';
    const events = trackEvents();

    await request(app.getHttpServer())
      .post('/auth/signup')
      .send({ email, password })
      .expect(201);
    expect(events.verificationToken).toBeTruthy();

    mockVerifyIdToken.mockResolvedValueOnce(
      buildGoogleVerifyResult({
        sub: 'google-unverified-user',
        email,
      }),
    );

    await request(app.getHttpServer())
      .post('/auth/google')
      .send({ credential: 'valid-google-token' })
      .expect(409)
      .expect((res) => {
        expect(res.body.message).toBe('Verify email before linking Google');
        expect(res.body.code).toBe('VERIFY_EMAIL_BEFORE_GOOGLE_LINK');
      });
  });

  it('google signin rejects invalid token with 401', async () => {
    mockVerifyIdToken.mockRejectedValueOnce(new Error('invalid token'));

    await request(app.getHttpServer())
      .post('/auth/google')
      .send({ credential: 'bad-token' })
      .expect(401)
      .expect((res) => {
        expect(res.body.message).toBe('Invalid Google token');
      });
  });

  it('signin rejects oauth-only user with 401', async () => {
    mockVerifyIdToken.mockResolvedValueOnce(
      buildGoogleVerifyResult({
        sub: 'google-oauth-only',
        email: 'oauth-only@example.com',
      }),
    );

    await request(app.getHttpServer())
      .post('/auth/google')
      .send({ credential: 'valid-google-token' })
      .expect(201);

    await request(app.getHttpServer())
      .post('/auth/signin')
      .send({ email: 'oauth-only@example.com', password: 'any-password' })
      .expect(401)
      .expect((res) => {
        expect(res.body.message).toBe('Invalid credentials');
      });
  });

  it('google user can set password via forgot-password and sign in with email', async () => {
    const email = 'set-pass-google@example.com';
    const newPassword = 'New-password99!';

    mockVerifyIdToken.mockResolvedValueOnce(
      buildGoogleVerifyResult({
        sub: 'google-set-pass',
        email,
      }),
    );

    await request(app.getHttpServer())
      .post('/auth/google')
      .send({ credential: 'valid-google-token' })
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
      .send({ email, password: newPassword })
      .expect(201);

    mockVerifyIdToken.mockResolvedValueOnce(
      buildGoogleVerifyResult({
        sub: 'google-set-pass',
        email,
      }),
    );

    await request(app.getHttpServer())
      .post('/auth/google')
      .send({ credential: 'valid-google-token' })
      .expect(201);
  });
});
