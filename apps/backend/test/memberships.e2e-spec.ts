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

  it('email signup writes an OWNER membership', async () => {
    const email = 'member-signup@example.com';
    await createVerifiedUser(app, email, 'Password123!');

    const [user] = await dataSource.query<{ id: string }[]>(
      `SELECT "id" FROM "users" WHERE "email" = $1`,
      [email],
    );
    const [membership] = await membershipsFor(user.id);

    expect(await membershipsFor(user.id)).toEqual([
      {
        userId: user.id,
        companyId: membership.companyId,
        role: MembershipRole.OWNER,
        status: 'active',
      },
    ]);
  });

  it('google signup writes an OWNER membership', async () => {
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
        role: MembershipRole.OWNER,
        status: 'active',
      },
    ]);
  });

  it('admin-created user writes a membership with the given role', async () => {
    await createVerifiedUser(app, 'member-admin@example.com', 'Password123!');
    const admin = request.agent(app.getHttpServer());
    await admin
      .post('/auth/signin')
      .send({ email: 'member-admin@example.com', password: 'Password123!' })
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
    await createVerifiedUser(app, email, 'Password123!');
    const [user] = await dataSource.query<{ id: string }[]>(
      `SELECT "id" FROM "users" WHERE "email" = $1`,
      [email],
    );
    const [initialMembership] = await membershipsFor(user.id);
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
      .send({ email, password: 'Password123!' })
      .expect(201);
    const me = await agent.get('/auth/me').expect(200);

    expect(me.body.companyId).toBe(initialMembership.companyId);
    expect(me.body.role).toBe(MembershipRole.OWNER);
  });

  it('user without memberships signs in with a company-less session', async () => {
    const email = 'member-less@example.com';
    await createVerifiedUser(app, email, 'Password123!');
    const [user] = await dataSource.query<{ id: string }[]>(
      `SELECT "id" FROM "users" WHERE "email" = $1`,
      [email],
    );
    await dataSource.query(`DELETE FROM "memberships" WHERE "userId" = $1`, [
      user.id,
    ]);

    const agent = request.agent(app.getHttpServer());
    await agent
      .post('/auth/signin')
      .send({ email, password: 'Password123!' })
      .expect(201);
    const me = await agent.get('/auth/me').expect(200);

    expect(me.body.companyId).toBeNull();
    expect(me.body.role).toBeNull();
    await agent
      .get('/vehicles')
      .expect(200)
      .expect(({ body }) =>
        expect(body).toMatchObject({ items: [], total: 0, totalPages: 0 }),
      );
    await agent.get('/drivers').expect(200, []);
    await agent.get('/auth/invitations').expect(200, []);
    await agent.get('/company').expect(403, {
      message: 'No active workspace',
      error: 'Forbidden',
      statusCode: 403,
    });
    await agent
      .post('/drivers')
      .send({ firstName: 'Jan', lastName: 'Kowalski' })
      .expect(403);

    const created = await agent
      .post('/companies')
      .send({ name: ' New workspace ' })
      .expect(201);
    expect(created.body).toMatchObject({ name: 'New workspace' });

    await agent
      .get('/auth/me')
      .expect(200)
      .expect(({ body }) => {
        expect(body.companyId).toBe(created.body.id);
        expect(body.role).toBe(MembershipRole.OWNER);
      });
    await agent.get('/auth/companies').expect(200, [
      {
        id: created.body.id,
        name: 'New workspace',
        role: MembershipRole.OWNER,
      },
    ]);
  });

  it('lists active companies and switches the active workspace', async () => {
    const email = 'member-switch@example.com';
    await createVerifiedUser(app, email, 'Password123!');
    const [user] = await dataSource.query<{ id: string }[]>(
      `SELECT "id" FROM "users" WHERE "email" = $1`,
      [email],
    );
    const [initialMembership] = await membershipsFor(user.id);
    const [company] = await dataSource.query<{ id: string }[]>(
      `INSERT INTO "companies" ("name", "createdAt", "updatedAt")
       VALUES ('Second workspace', now(), now()) RETURNING "id"`,
    );
    const [pendingCompany] = await dataSource.query<{ id: string }[]>(
      `INSERT INTO "companies" ("name", "createdAt", "updatedAt")
       VALUES ('Pending workspace', now(), now()) RETURNING "id"`,
    );
    const [foreignCompany] = await dataSource.query<{ id: string }[]>(
      `INSERT INTO "companies" ("name", "createdAt", "updatedAt")
       VALUES ('Foreign workspace', now(), now()) RETURNING "id"`,
    );
    await dataSource.query(
      `INSERT INTO "memberships" ("userId", "companyId", "role", "status", "createdAt", "updatedAt")
       VALUES ($1, $2, 'MANAGER', 'active', now(), now()),
              ($1, $3, 'MANAGER', 'pending', now(), now())`,
      [user.id, company.id, pendingCompany.id],
    );

    const agent = request.agent(app.getHttpServer());
    await agent
      .post('/auth/signin')
      .send({ email, password: 'Password123!' })
      .expect(201);

    await agent
      .get('/auth/companies')
      .expect(200)
      .expect((response) => {
        expect(response.body).toHaveLength(2);
        expect(response.body).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              id: initialMembership.companyId,
              role: MembershipRole.OWNER,
            }),
            {
              id: company.id,
              name: 'Second workspace',
              role: MembershipRole.MANAGER,
            },
          ]),
        );
      });
    await agent
      .post('/auth/switch-company')
      .send({ companyId: company.id })
      .expect(204);
    await agent
      .post('/auth/switch-company')
      .send({ companyId: pendingCompany.id })
      .expect(403);
    await agent
      .post('/auth/switch-company')
      .send({ companyId: foreignCompany.id })
      .expect(403);
    await agent
      .get('/company')
      .expect(200)
      .expect((response) => {
        expect(response.body).toMatchObject({
          id: company.id,
          name: 'Second workspace',
        });
      });
  });
});
