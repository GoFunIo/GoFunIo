import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { DataSource } from 'typeorm';
import { createTestApp } from './helpers/create-test-app';
import {
  captureEmittedEvents,
  createVerifiedUser,
} from './helpers/auth-test-utils';
import { VehicleDeadlineAlertPolicy } from '../src/alert-policy/vehicle-deadline-alert-policy.entity';
import { MembershipRole } from '../src/users/membership-role';
import { SwaggerModule } from '@nestjs/swagger';
import { createSwaggerConfig } from '../src/swagger-document';

describe('Vehicle Deadline Alert Policy (e2e)', () => {
  let app: INestApplication<App>;
  let currentInstant = new Date('2026-08-27T10:00:00.000Z');

  beforeAll(async () => {
    app = (await createTestApp({
      clock: { now: () => new Date(currentInstant) },
    })) as INestApplication<App>;
  });

  beforeEach(() => {
    currentInstant = new Date('2026-08-27T10:00:00.000Z');
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
    role: MembershipRole,
  ) {
    const events = captureEmittedEvents(app);
    try {
      await owner.post('/users').send({ email, role }).expect(201);
      if (!events.passwordResetToken) throw new Error('Expected invite token');
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

  it('returns the default policy provisioned for the Active Workspace', async () => {
    const owner = await signedIn('alert-policy-owner@example.com');

    await owner
      .get('/alert-policy')
      .expect(200)
      .expect(({ body }) => {
        expect(body).toEqual({
          enabledDeadlineKinds: ['OC', 'AC', 'TECHNICAL_INSPECTION'],
          leadDays: [30, 14, 7, 0],
          timeZone: 'Europe/Warsaw',
        });
      });
  });

  it('lets the Workspace Owner update and reread the policy', async () => {
    const owner = await signedIn('alert-policy-update@example.com');
    currentInstant = new Date('2026-08-28T11:30:00.000Z');

    await owner
      .patch('/alert-policy')
      .send({
        enabledDeadlineKinds: ['TECHNICAL_INSPECTION', 'OC'],
        leadDays: [0, 60, 14],
        timeZone: 'America/New_York',
      })
      .expect(200)
      .expect(({ body }) => {
        expect(body).toEqual({
          enabledDeadlineKinds: ['TECHNICAL_INSPECTION', 'OC'],
          leadDays: [60, 14, 0],
          timeZone: 'America/New_York',
        });
      });

    const policy = await app
      .get(DataSource)
      .getRepository(VehicleDeadlineAlertPolicy)
      .findOneByOrFail({
        companyId: (await owner.get('/auth/me').expect(200)).body.companyId,
      });
    expect(policy.activatedAt).toEqual(currentInstant);

    currentInstant = new Date('2026-08-29T12:45:00.000Z');
    await owner
      .patch('/alert-policy')
      .send({ timeZone: 'America/New_York' })
      .expect(200);
    await expect(
      app
        .get(DataSource)
        .getRepository(VehicleDeadlineAlertPolicy)
        .findOneByOrFail({ companyId: policy.companyId }),
    ).resolves.toMatchObject({ activatedAt: currentInstant });

    await owner
      .get('/alert-policy')
      .expect(200)
      .expect(({ body }) => {
        expect(body.leadDays).toEqual([60, 14, 0]);
      });
  });

  it('allows ADMIN to mutate, lets MANAGER read, and rejects MANAGER mutation', async () => {
    const owner = await signedIn('alert-policy-roles-owner@example.com');
    const admin = await invite(
      owner,
      'alert-policy-admin@example.com',
      MembershipRole.ADMIN,
    );
    const manager = await invite(
      owner,
      'alert-policy-manager@example.com',
      MembershipRole.MANAGER,
    );

    await admin
      .patch('/alert-policy')
      .send({ leadDays: [90, 30, 0] })
      .expect(200);
    await manager
      .get('/alert-policy')
      .expect(200)
      .expect(({ body }) => expect(body.leadDays).toEqual([90, 30, 0]));
    await manager
      .patch('/alert-policy')
      .send({ leadDays: [7] })
      .expect(403);
  });

  it('rejects invalid policy fields with stable validation messages', async () => {
    const owner = await signedIn('alert-policy-validation@example.com');

    await owner
      .patch('/alert-policy')
      .send({
        enabledDeadlineKinds: ['OC', 'OC', 'SERVICE'],
        leadDays: [7, 7, -1, 366, 1.5],
        timeZone: 'Warsaw/Not_A_Zone',
      })
      .expect(400)
      .expect(({ body }) => {
        expect(body.message).toEqual(
          expect.arrayContaining([
            "All enabledDeadlineKinds's elements must be unique",
            'each value in enabledDeadlineKinds must be one of the following values: OC, AC, TECHNICAL_INSPECTION',
            "All leadDays's elements must be unique",
            'each value in leadDays must not be less than 0',
            'each value in leadDays must not be greater than 365',
            'each value in leadDays must be an integer number',
            'timeZone must be a valid IANA time zone',
          ]),
        );
      });

    await owner.patch('/alert-policy').send({ leadDays: [] }).expect(400);
    for (const field of [
      'enabledDeadlineKinds',
      'leadDays',
      'timeZone',
    ] as const) {
      await owner
        .patch('/alert-policy')
        .send({ [field]: null })
        .expect(400);
    }
    await owner.patch('/alert-policy').send({}).expect(400);
  });

  it('allows an empty enabled-kind set to disable all deadline Alerts', async () => {
    const owner = await signedIn('alert-policy-disabled@example.com');

    await owner
      .patch('/alert-policy')
      .send({ enabledDeadlineKinds: [] })
      .expect(200)
      .expect(({ body }) => expect(body.enabledDeadlineKinds).toEqual([]));
  });

  it('isolates policies by Active Workspace and rejects client tenant scope', async () => {
    const first = await signedIn('alert-policy-first@example.com');
    const second = await signedIn('alert-policy-second@example.com');

    await first
      .patch('/alert-policy')
      .send({
        leadDays: [120],
        companyId: '00000000-0000-0000-0000-000000000000',
      })
      .expect(400);
    await first
      .patch('/alert-policy')
      .send({ leadDays: [120] })
      .expect(200);
    await second
      .get('/alert-policy')
      .expect(200)
      .expect(({ body }) => expect(body.leadDays).toEqual([30, 14, 7, 0]));
  });

  it('provisions defaults when an existing User creates another Workspace', async () => {
    const owner = await signedIn('alert-policy-company-create@example.com');
    await owner
      .post('/companies')
      .send({ name: 'Second Workspace' })
      .expect(201);

    await owner
      .get('/alert-policy')
      .expect(200)
      .expect(({ body }) => {
        expect(body).toEqual({
          enabledDeadlineKinds: ['OC', 'AC', 'TECHNICAL_INSPECTION'],
          leadDays: [30, 14, 7, 0],
          timeZone: 'Europe/Warsaw',
        });
      });
  });

  it('requires authentication', async () => {
    await request(app.getHttpServer()).get('/alert-policy').expect(401);
    await request(app.getHttpServer())
      .patch('/alert-policy')
      .send({ leadDays: [7] })
      .expect(401);
  });

  it('documents the policy representation and validation contract in Swagger', () => {
    const document = SwaggerModule.createDocument(app, createSwaggerConfig());
    const patch = document.paths['/alert-policy'].patch;
    const schemas = document.components?.schemas ?? {};

    expect(patch?.responses?.['400']).toMatchObject({
      description: expect.stringContaining(
        'leadDays must contain 1–10 distinct integers from 0 through 365',
      ),
    });
    expect(schemas.VehicleDeadlineAlertPolicyDto).toMatchObject({
      required: ['enabledDeadlineKinds', 'leadDays', 'timeZone'],
    });
    expect(schemas.UpdateVehicleDeadlineAlertPolicyDto).toMatchObject({
      properties: {
        enabledDeadlineKinds: {
          type: 'array',
          uniqueItems: true,
          maxItems: 3,
        },
        leadDays: {
          type: 'array',
          uniqueItems: true,
          minItems: 1,
          maxItems: 10,
          items: { type: 'integer', minimum: 0, maximum: 365 },
        },
        timeZone: { type: 'string' },
      },
    });
  });
});
