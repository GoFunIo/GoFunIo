import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { createTestApp } from './helpers/create-test-app';

describe('AppController (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    app = (await createTestApp()) as INestApplication<App>;
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  it('GET /status returns backend connection message', () => {
    return request(app.getHttpServer())
      .get('/status')
      .expect(200)
      .expect({ message: 'backend is connected' });
  });
});
