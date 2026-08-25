import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { createTestApp } from './helpers/create-test-app';

describe('AppController (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    app = (await createTestApp({
      enableThrottling: true,
    })) as INestApplication<App>;
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  it('exposes the global limit on GET /status', async () => {
    await request(app.getHttpServer())
      .get('/status')
      .expect(200)
      .expect('X-RateLimit-Limit', '1000')
      .expect({ message: 'backend is connected' });
  });

  it('enforces a stricter route override', async () => {
    await request(app.getHttpServer())
      .post('/auth/forgot-password')
      .send({})
      .expect(400)
      .expect('X-RateLimit-Limit', '1');
    await request(app.getHttpServer())
      .post('/auth/forgot-password')
      .send({})
      .expect(429);
  });
});
