import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { ATTACHMENT_OBJECT_STORE } from '../src/attachment-storage/attachment-object-store';
import { InMemoryAttachmentObjectStore } from '../src/attachment-storage/in-memory-attachment-object-store';
import { MAX_ATTACHMENT_SIZE } from '../src/service-attachments/attachment-file';
import { ServiceType } from '../src/services/services.entity';
import { createVerifiedUser } from './helpers/auth-test-utils';
import { createTestApp } from './helpers/create-test-app';

describe('Service Attachments (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    app = (await createTestApp()) as INestApplication<App>;
  });

  afterAll(async () => app.close());

  async function serviceOwner(email: string) {
    await createVerifiedUser(app, email, 'password123');
    const agent = request.agent(app.getHttpServer());
    await agent
      .post('/auth/signin')
      .send({ email, password: 'password123' })
      .expect(201);
    const vehicle = await agent
      .post('/vehicles')
      .send({ brand: 'Volvo', model: 'XC60', registrationNumber: 'ATTACH1' })
      .expect(201);
    const service = await agent
      .post('/services')
      .send({
        vehicleId: vehicle.body.id,
        serviceDate: '2026-08-01',
        type: ServiceType.OIL_CHANGE,
        cost: 499.99,
        providerName: 'Local Garage',
      })
      .expect(201);
    return { agent, serviceId: service.body.id as string };
  }

  it('creates and lists safe Attachment metadata newest first', async () => {
    const { agent, serviceId } = await serviceOwner(
      'attachment-collection@example.com',
    );
    const first = await agent
      .post(`/services/${serviceId}/attachments`)
      .attach('attachment', Buffer.from('%PDF-first'), {
        filename: 'first.pdf',
        contentType: 'application/pdf',
      })
      .expect(201);
    const second = await agent
      .post(`/services/${serviceId}/attachments`)
      .attach(
        'attachment',
        Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
        { filename: 'second.png', contentType: 'image/png' },
      )
      .expect(201);

    expect(first.body).toEqual({
      id: expect.any(String),
      name: 'first.pdf',
      mimeType: 'application/pdf',
      size: 10,
      createdAt: expect.any(String),
    });
    expect(second.body).not.toHaveProperty('objectKey');

    await agent
      .get(`/services/${serviceId}/attachments`)
      .expect(200)
      .expect(({ body }) =>
        expect(body.map(({ id }: { id: string }) => id)).toEqual([
          second.body.id,
          first.body.id,
        ]),
      );
    await agent
      .get(`/services/${serviceId}`)
      .expect(200)
      .expect(({ body }) =>
        expect(body.attachments.map(({ id }: { id: string }) => id)).toEqual([
          second.body.id,
          first.body.id,
        ]),
      );
    await agent
      .patch(`/services/${serviceId}`)
      .send({ notes: 'Includes receipts' })
      .expect(200)
      .expect(({ body }) => expect(body.attachments).toHaveLength(2));
    await agent
      .get('/services')
      .expect(200)
      .expect(({ body }) => {
        expect(body.items[0]).toMatchObject({
          id: serviceId,
          attachmentCount: 2,
          hasAttachment: true,
        });
        expect(body.items[0]).not.toHaveProperty('attachments');
      });
  });

  it('returns stable errors for invalid multipart uploads', async () => {
    const { agent, serviceId } = await serviceOwner(
      'attachment-validation@example.com',
    );
    const endpoint = `/services/${serviceId}/attachments`;

    await agent
      .post(endpoint)
      .expect(400)
      .expect(({ body }) =>
        expect(body).toMatchObject({
          code: 'ATTACHMENT_REQUIRED',
          field: 'attachment',
        }),
      );
    await agent
      .post(endpoint)
      .attach('attachment', Buffer.alloc(0), {
        filename: 'empty.pdf',
        contentType: 'application/pdf',
      })
      .expect(400)
      .expect(({ body }) =>
        expect(body).toMatchObject({
          code: 'ATTACHMENT_CONTENT_INVALID',
          field: 'attachment',
        }),
      );
    await agent
      .post(endpoint)
      .attach('attachment', Buffer.from('<svg/>'), {
        filename: 'image.svg',
        contentType: 'image/svg+xml',
      })
      .expect(415)
      .expect(({ body }) =>
        expect(body).toMatchObject({
          code: 'ATTACHMENT_TYPE_NOT_ALLOWED',
          field: 'attachment',
        }),
      );
    await agent
      .post(endpoint)
      .attach('attachment', Buffer.from('not a PDF'), {
        filename: 'report.pdf',
        contentType: 'application/pdf',
      })
      .expect(400)
      .expect(({ body }) =>
        expect(body).toMatchObject({
          code: 'ATTACHMENT_CONTENT_INVALID',
          field: 'attachment',
        }),
      );
    await agent
      .post(endpoint)
      .attach('attachment', Buffer.alloc(MAX_ATTACHMENT_SIZE + 1), {
        filename: 'large.pdf',
        contentType: 'application/pdf',
      })
      .expect(413)
      .expect(({ body }) =>
        expect(body).toMatchObject({
          code: 'ATTACHMENT_TOO_LARGE',
          field: 'attachment',
        }),
      );
    await agent
      .post(endpoint)
      .attach('attachment', Buffer.from('%PDF-one'), {
        filename: 'one.pdf',
        contentType: 'application/pdf',
      })
      .attach('attachment', Buffer.from('%PDF-two'), {
        filename: 'two.pdf',
        contentType: 'application/pdf',
      })
      .expect(400)
      .expect(({ body }) =>
        expect(body).toMatchObject({
          code: 'ATTACHMENT_CONTENT_INVALID',
          field: 'attachment',
        }),
      );
  });

  it('allows duplicate names but rejects a sixth active Attachment', async () => {
    const { agent, serviceId } = await serviceOwner(
      'attachment-limit@example.com',
    );
    const endpoint = `/services/${serviceId}/attachments`;

    for (let index = 0; index < 5; index += 1) {
      await agent
        .post(endpoint)
        .attach('attachment', Buffer.from(`%PDF-${index}`), {
          filename: 'receipt.pdf',
          contentType: 'application/pdf',
        })
        .expect(201);
    }

    await agent
      .post(endpoint)
      .attach('attachment', Buffer.from('%PDF-sixth'), {
        filename: 'receipt.pdf',
        contentType: 'application/pdf',
      })
      .expect(409)
      .expect(({ body }) =>
        expect(body).toMatchObject({
          code: 'SERVICE_ATTACHMENT_LIMIT_REACHED',
          field: 'attachment',
        }),
      );
    await agent
      .get(endpoint)
      .expect(200)
      .expect(({ body }) => {
        expect(body).toHaveLength(5);
        expect(
          body.every(({ name }: { name: string }) => name === 'receipt.pdf'),
        ).toBe(true);
      });
  });

  it('masks inaccessible and deleted parent Services', async () => {
    const owner = await serviceOwner('attachment-owner@example.com');
    const outsider = await serviceOwner('attachment-outsider@example.com');
    const endpoint = `/services/${owner.serviceId}/attachments`;

    await outsider.agent.get(endpoint).expect(404);
    await outsider.agent
      .post(endpoint)
      .attach('attachment', Buffer.from('%PDF-private'), {
        filename: 'private.pdf',
        contentType: 'application/pdf',
      })
      .expect(404);
    await owner.agent.delete(`/services/${owner.serviceId}`).expect(204);
    await owner.agent.get(endpoint).expect(404);
  });

  it('maps object-store failures to a stable unavailable response', async () => {
    const { agent, serviceId } = await serviceOwner(
      'attachment-storage-error@example.com',
    );
    app
      .get<InMemoryAttachmentObjectStore>(ATTACHMENT_OBJECT_STORE)
      .failNext('put');

    await agent
      .post(`/services/${serviceId}/attachments`)
      .attach('attachment', Buffer.from('%PDF-storage'), {
        filename: 'storage.pdf',
        contentType: 'application/pdf',
      })
      .expect(503)
      .expect(({ body }) =>
        expect(body).toMatchObject({
          code: 'ATTACHMENT_STORAGE_UNAVAILABLE',
          field: 'attachment',
        }),
      );
  });
});
