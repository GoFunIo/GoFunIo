import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { DataSource } from 'typeorm';
import { MembershipRole } from '../src/users/membership-role';
import { createTestApp } from './helpers/create-test-app';
import {
  buildGoogleVerifyResult,
  captureEmittedEvents,
  createVerifiedUser,
} from './helpers/auth-test-utils';

const mockVerifyIdToken = jest.fn();

jest.mock('google-auth-library', () => ({
  OAuth2Client: jest.fn().mockImplementation(() => ({
    verifyIdToken: mockVerifyIdToken,
  })),
}));

interface MembershipRow {
  userId: string;
  companyId: string;
  role: MembershipRole;
  status: string;
}

describe('Memberships dual-write (e2e)', () => {
  let app: INestApplication<App>;
  let dataSource: DataSource;

  beforeAll(async () => {
    app = (await createTestApp()) as INestApplication<App>;
    dataSource = app.get(DataSource);
  });

  afterEach(() => mockVerifyIdToken.mockReset());

  afterAll(async () => app.close());

  function membershipsFor(userId: string): Promise<MembershipRow[]> {
    return dataSource.query<MembershipRow[]>(
      `SELECT "userId", "companyId", "role", "status" FROM "memberships" WHERE "userId" = $1`,
      [userId],
    );
  }

  it('email signup writes an ADMIN membership', async () => {
    const email = 'member-signup@example.com';
    await createVerifiedUser(app, email, 'password123');

    const [user] = await dataSource.query<{ id: string; companyId: string }[]>(
      `SELECT "id", "companyId" FROM "users" WHERE "email" = $1`,
      [email],
    );

    expect(await membershipsFor(user.id)).toEqual([
      {
        userId: user.id,
        companyId: user.companyId,
        role: MembershipRole.ADMIN,
        status: 'active',
      },
    ]);
  });

  it('google signup writes an ADMIN membership', async () => {
    mockVerifyIdToken.mockResolvedValue(
      buildGoogleVerifyResult({
        sub: 'google-membership-user',
        email: 'member-google@example.com',
      }),
    );

    const response = await request(app.getHttpServer())
      .post('/auth/google')
      .send({ credential: 'valid-google-token' })
      .expect(201);

    expect(await membershipsFor(response.body.id)).toEqual([
      {
        userId: response.body.id,
        companyId: response.body.companyId,
        role: MembershipRole.ADMIN,
        status: 'active',
      },
    ]);
  });

  it('admin-created user writes a membership with the given role', async () => {
    await createVerifiedUser(app, 'member-admin@example.com', 'password123');
    const admin = request.agent(app.getHttpServer());
    await admin
      .post('/auth/signin')
      .send({ email: 'member-admin@example.com', password: 'password123' })
      .expect(201);

    const events = captureEmittedEvents(app);
    let created: { id: string; companyId: string };
    try {
      const response = await admin
        .post('/users')
        .send({ email: 'member-invited@example.com', role: 'MANAGER' })
        .expect(201);
      created = response.body;
    } finally {
      events.restore();
    }

    expect(await membershipsFor(created.id)).toEqual([
      {
        userId: created.id,
        companyId: created.companyId,
        role: MembershipRole.MANAGER,
        status: 'active',
      },
    ]);
  });

  it('signin picks the oldest active membership as the current company', async () => {
    const email = 'member-oldest@example.com';
    await createVerifiedUser(app, email, 'password123');
    const [user] = await dataSource.query<{ id: string; companyId: string }[]>(
      `SELECT "id", "companyId" FROM "users" WHERE "email" = $1`,
      [email],
    );
    const [newerCompany] = await dataSource.query<{ id: string }[]>(
      `INSERT INTO "companies" ("name", "createdAt", "updatedAt")
       VALUES ('Newer workspace', now(), now()) RETURNING "id"`,
    );
    await dataSource.query(
      `INSERT INTO "memberships" ("userId", "companyId", "role", "status", "createdAt", "updatedAt")
       VALUES ($1, $2, 'MANAGER', 'active', now() + interval '1 minute', now())`,
      [user.id, newerCompany.id],
    );

    const agent = request.agent(app.getHttpServer());
    await agent
      .post('/auth/signin')
      .send({ email, password: 'password123' })
      .expect(201);
    const me = await agent.get('/auth/me').expect(200);

    expect(me.body.companyId).toBe(user.companyId);
    expect(me.body.role).toBe(MembershipRole.ADMIN);
  });

  it('user without memberships signs in with a company-less session', async () => {
    const email = 'member-less@example.com';
    await createVerifiedUser(app, email, 'password123');
    const [user] = await dataSource.query<{ id: string }[]>(
      `SELECT "id" FROM "users" WHERE "email" = $1`,
      [email],
    );
    await dataSource.query(
      `DELETE FROM "memberships" WHERE "userId" = $1`,
      [user.id],
    );

    const agent = request.agent(app.getHttpServer());
    await agent
      .post('/auth/signin')
      .send({ email, password: 'password123' })
      .expect(201);
    const me = await agent.get('/auth/me').expect(200);

    expect(me.body.companyId).toBeNull();
    expect(me.body.role).toBeNull();
    await agent.get('/vehicles').expect(403);
  });
});
