import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { createTestApp } from './helpers/create-test-app';
import { createVerifiedUser } from './helpers/auth-test-utils';
import {
  VinDecoderUnavailableError,
  type VinDecoder,
} from '../src/vin-lookup/vin-decoder';

const VIN = '1HGCM82633A004352';

describe('VIN lookup (e2e)', () => {
  let app: INestApplication<App>;
  let agent: ReturnType<typeof request.agent>;
  const decode = jest.fn<ReturnType<VinDecoder['decode']>, [string]>();

  beforeAll(async () => {
    app = (await createTestApp({
      vinDecoder: { decode },
    })) as INestApplication<App>;
  });

  beforeEach(async () => {
    decode.mockReset();
    const email = `vin-lookup-${Date.now()}@example.com`;
    await createVerifiedUser(app, email, 'Password123!');
    agent = request.agent(app.getHttpServer());
    await agent
      .post('/auth/signin')
      .send({ email, password: 'Password123!' })
      .expect(201);
  });

  afterAll(() => app.close());

  it('requires a session', async () => {
    await request(app.getHttpServer())
      .get(`/vehicles/vin-lookup/${VIN}`)
      .expect(401);
    expect(decode).not.toHaveBeenCalled();
  });

  it('normalizes the VIN and returns decoded data', async () => {
    decode.mockResolvedValue({
      brand: 'Honda',
      model: null,
      year: 2003,
      fuelType: null,
    });

    const { body } = await agent
      .get(`/vehicles/vin-lookup/${VIN.toLowerCase()}`)
      .expect(200);

    expect(decode).toHaveBeenCalledWith(VIN);
    expect(body).toEqual({
      vin: VIN,
      brand: 'Honda',
      model: null,
      year: 2003,
      fuelType: null,
    });
  });

  it.each(['1HGCM82633A00435', '1HGCM82633A0043521', 'IHGCM82633A004352'])(
    'rejects malformed VIN %s without calling the provider',
    async (vin) => {
      await agent.get(`/vehicles/vin-lookup/${vin}`).expect(400);
      expect(decode).not.toHaveBeenCalled();
    },
  );

  it('answers 404 when the provider recognizes nothing', async () => {
    decode.mockResolvedValue(null);

    await agent.get(`/vehicles/vin-lookup/${VIN}`).expect(404);
  });

  it('answers 503 when the provider is unavailable', async () => {
    decode.mockRejectedValue(
      new VinDecoderUnavailableError(new Error('timeout')),
    );

    await agent.get(`/vehicles/vin-lookup/${VIN}`).expect(503);
  });
});
