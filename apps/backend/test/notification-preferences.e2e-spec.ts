import { INestApplication } from '@nestjs/common';
import { SwaggerModule } from '@nestjs/swagger';
import request from 'supertest';
import { App } from 'supertest/types';
import { DataSource } from 'typeorm';
import { createSwaggerConfig } from '../src/swagger-document';
import { MembershipRole } from '../src/users/membership-role';
import { createTestApp } from './helpers/create-test-app';
import {
  captureEmittedEvents,
  createVerifiedUser,
} from './helpers/auth-test-utils';

const categories = [
  'FLEET_DEADLINES',
  'VEHICLE_ACCESS',
  'MEMBERSHIP',
  'SERVICE',
  'PRODUCT',
];

describe('Membership Notification Preferences (e2e)', () => {
  let app: INestApplication<App>;
  let dataSource: DataSource;

  beforeAll(async () => {
    app = (await createTestApp()) as INestApplication<App>;
    dataSource = app.get(DataSource);
  });

  afterAll(async () => app.close());

  async function signedIn(email: string, password = 'Password123!') {
    await createVerifiedUser(app, email, password);
    const agent = request.agent(app.getHttpServer());
    await agent.post('/auth/signin').send({ email, password }).expect(201);
    return agent;
  }

  async function invite(
    owner: ReturnType<typeof request.agent>,
    email: string,
  ) {
    const events = captureEmittedEvents(app);
    try {
      await owner
        .post('/users')
        .send({ email, role: MembershipRole.MANAGER })
        .expect(201);
      await request(app.getHttpServer())
        .post('/auth/reset-password')
        .send({
          token: events.passwordResetToken,
          password: 'Invited-password1!',
        })
        .expect(204);
      const agent = request.agent(app.getHttpServer());
      await agent
        .post('/auth/signin')
        .send({ email, password: 'Invited-password1!' })
        .expect(201);
      return agent;
    } finally {
      events.restore();
    }
  }

  it('returns effective defaults for every category without persisting rows', async () => {
    const owner = await signedIn('preferences-defaults@example.com');

    await owner.get('/notification-preferences/me').expect(200, {
      preferences: categories.map((category) => ({
        category,
        emailMode: 'IMMEDIATE',
        showLiveToasts: true,
      })),
    });

    await expect(
      dataSource.query(`SELECT * FROM "notification_preferences"`),
    ).resolves.toHaveLength(0);
  });

  it('supports partial and full PATCH while preserving independent values', async () => {
    const owner = await signedIn('preferences-patch@example.com');

    await owner
      .patch('/notification-preferences/me')
      .send({
        preferences: [
          { category: 'SERVICE', emailMode: 'OFF' },
          { category: 'PRODUCT', showLiveToasts: false },
        ],
      })
      .expect(200)
      .expect(({ body }) => {
        expect(body.preferences).toEqual(
          expect.arrayContaining([
            {
              category: 'SERVICE',
              emailMode: 'OFF',
              showLiveToasts: true,
            },
            {
              category: 'PRODUCT',
              emailMode: 'IMMEDIATE',
              showLiveToasts: false,
            },
          ]),
        );
      });

    await owner
      .patch('/notification-preferences/me')
      .send({
        preferences: [
          {
            category: 'SERVICE',
            emailMode: 'IMMEDIATE',
            showLiveToasts: false,
          },
        ],
      })
      .expect(200);

    await owner.get('/notification-preferences/me').expect(({ body }) => {
      expect(
        body.preferences.find(
          ({ category }: { category: string }) => category === 'SERVICE',
        ),
      ).toEqual({
        category: 'SERVICE',
        emailMode: 'IMMEDIATE',
        showLiveToasts: false,
      });
    });
  });

  it('idempotently upserts only the current Membership preferences', async () => {
    const owner = await signedIn('preferences-owner@example.com');
    const manager = await invite(owner, 'preferences-manager@example.com');
    await owner
      .patch('/notification-preferences/me')
      .send({
        preferences: [
          {
            category: 'FLEET_DEADLINES',
            emailMode: 'IMMEDIATE',
            showLiveToasts: false,
          },
        ],
      })
      .expect(200);
    const update = {
      preferences: [
        {
          category: 'FLEET_DEADLINES',
          emailMode: 'OFF',
          showLiveToasts: false,
        },
      ],
    };

    await manager
      .patch('/notification-preferences/me')
      .send(update)
      .expect(200);
    await manager
      .patch('/notification-preferences/me')
      .send(update)
      .expect(200);

    const rows = await dataSource.query<
      Array<{ userId: string; category: string }>
    >(`
      SELECT membership."userId", preference.category::text
      FROM "notification_preferences" preference
      JOIN memberships membership
        ON membership.id = preference."membershipId"
       AND membership."companyId" = preference."companyId"
    `);
    expect(rows).toHaveLength(2);
    expect(rows.map(({ category }) => category)).toEqual([
      'FLEET_DEADLINES',
      'FLEET_DEADLINES',
    ]);

    await owner.get('/notification-preferences/me').expect(({ body }) => {
      expect(body.preferences[0]).toEqual({
        category: 'FLEET_DEADLINES',
        emailMode: 'IMMEDIATE',
        showLiveToasts: false,
      });
    });
  });

  it('handles concurrent identical upserts without duplicate rows or errors', async () => {
    const firstSession = await signedIn('preferences-concurrent@example.com');
    const secondSession = request.agent(app.getHttpServer());
    await secondSession
      .post('/auth/signin')
      .send({
        email: 'preferences-concurrent@example.com',
        password: 'Password123!',
      })
      .expect(201);
    const update = {
      preferences: [
        {
          category: 'VEHICLE_ACCESS',
          emailMode: 'OFF',
          showLiveToasts: false,
        },
      ],
    };

    const responses = await Promise.all([
      firstSession.patch('/notification-preferences/me').send(update),
      secondSession.patch('/notification-preferences/me').send(update),
    ]);
    expect(responses.map(({ status }) => status)).toEqual([200, 200]);
    await expect(
      dataSource.query(
        `SELECT * FROM notification_preferences WHERE category = 'VEHICLE_ACCESS'`,
      ),
    ).resolves.toHaveLength(1);
  });

  it('rejects invalid values, duplicate categories, empty changes, and client identity', async () => {
    const owner = await signedIn('preferences-validation@example.com');

    for (const body of [
      {},
      { preferences: [] },
      { preferences: [{ category: 'UNKNOWN', emailMode: 'OFF' }] },
      { preferences: [{ category: 'SERVICE', emailMode: 'DIGEST' }] },
      { preferences: [{ category: 'SERVICE', showLiveToasts: 'false' }] },
      { preferences: [{ category: 'SERVICE' }] },
      {
        preferences: [
          { category: 'SERVICE', emailMode: 'OFF' },
          { category: 'SERVICE', showLiveToasts: false },
        ],
      },
      {
        preferences: [{ category: 'SERVICE', emailMode: 'OFF' }],
        companyId: '00000000-0000-0000-0000-000000000000',
      },
      {
        preferences: [{ category: 'SERVICE', emailMode: 'OFF' }],
        membershipId: '00000000-0000-0000-0000-000000000000',
      },
      {
        preferences: [{ category: 'SERVICE', emailMode: 'OFF' }],
        userId: '00000000-0000-0000-0000-000000000000',
      },
    ]) {
      await owner.patch('/notification-preferences/me').send(body).expect(400);
    }
  });

  it('keeps different preferences for one User in two Active Workspaces', async () => {
    const agent = await signedIn('preferences-two-workspaces@example.com');
    const first = (await agent.get('/auth/me').expect(200)).body.companyId;

    await agent
      .patch('/notification-preferences/me')
      .send({
        preferences: [{ category: 'MEMBERSHIP', emailMode: 'OFF' }],
      })
      .expect(200);
    const second = (
      await agent
        .post('/companies')
        .send({ name: 'Second Workspace' })
        .expect(201)
    ).body.id;
    await agent
      .patch('/notification-preferences/me')
      .send({
        preferences: [{ category: 'MEMBERSHIP', showLiveToasts: false }],
      })
      .expect(200);

    await agent.get('/notification-preferences/me').expect(({ body }) => {
      expect(body.preferences[2]).toEqual({
        category: 'MEMBERSHIP',
        emailMode: 'IMMEDIATE',
        showLiveToasts: false,
      });
    });
    await agent
      .post('/auth/switch-company')
      .send({ companyId: first })
      .expect(204);
    await agent.get('/notification-preferences/me').expect(({ body }) => {
      expect(body.preferences[2]).toEqual({
        category: 'MEMBERSHIP',
        emailMode: 'OFF',
        showLiveToasts: true,
      });
    });

    const rows = await dataSource.query<Array<{ companyId: string }>>(
      `SELECT "companyId" FROM notification_preferences ORDER BY "companyId"`,
    );
    expect(rows.map(({ companyId }) => companyId).sort()).toEqual(
      [first, second].sort(),
    );
  });

  it('denies reads and mutations after the current Membership is removed', async () => {
    const owner = await signedIn('preferences-remove-owner@example.com');
    const manager = await invite(
      owner,
      'preferences-remove-manager@example.com',
    );
    const managerId = (await manager.get('/auth/me').expect(200)).body.id;

    await manager
      .patch('/notification-preferences/me')
      .send({ preferences: [{ category: 'PRODUCT', emailMode: 'OFF' }] })
      .expect(200);
    await owner.delete(`/users/${managerId}`).expect(204);

    await manager.get('/notification-preferences/me').expect(403);
    await manager
      .patch('/notification-preferences/me')
      .send({ preferences: [{ category: 'PRODUCT', emailMode: 'IMMEDIATE' }] })
      .expect(403);
    await expect(
      dataSource.query(
        `SELECT "emailMode"::text FROM notification_preferences`,
      ),
    ).resolves.toEqual([{ emailMode: 'OFF' }]);
  });

  it('requires authentication', async () => {
    await request(app.getHttpServer())
      .get('/notification-preferences/me')
      .expect(401);
    await request(app.getHttpServer())
      .patch('/notification-preferences/me')
      .send({ preferences: [{ category: 'SERVICE', emailMode: 'OFF' }] })
      .expect(401);
  });

  it('documents the complete collection and enum contract in Swagger', () => {
    const document = SwaggerModule.createDocument(app, createSwaggerConfig());
    const schemas = document.components?.schemas ?? {};
    const path = document.paths['/notification-preferences/me'];

    expect(path.get?.responses?.['200']).toBeDefined();
    expect(path.patch).toMatchObject({
      requestBody: {
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/UpdateNotificationPreferencesDto',
            },
          },
        },
      },
      responses: {
        '200': expect.any(Object),
        '400': expect.any(Object),
        '401': expect.any(Object),
        '403': expect.any(Object),
      },
    });
    expect(schemas.NotificationPreferenceDto).toMatchObject({
      required: ['category', 'emailMode', 'showLiveToasts'],
      properties: {
        category: { enum: categories },
        emailMode: { enum: ['OFF', 'IMMEDIATE'] },
        showLiveToasts: { type: 'boolean' },
      },
    });
    expect(schemas.NotificationPreferencesDto).toMatchObject({
      required: ['preferences'],
      properties: {
        preferences: {
          type: 'array',
          minItems: 5,
          maxItems: 5,
        },
      },
    });
    expect(schemas.UpdateNotificationPreferenceDto).toMatchObject({
      required: ['category'],
      properties: {
        category: { enum: categories },
        emailMode: { enum: ['OFF', 'IMMEDIATE'] },
        showLiveToasts: { type: 'boolean' },
      },
    });
    expect(schemas.UpdateNotificationPreferencesDto).toMatchObject({
      required: ['preferences'],
      properties: {
        preferences: {
          type: 'array',
          minItems: 1,
          maxItems: 5,
          uniqueItems: true,
        },
      },
    });
  });
});
