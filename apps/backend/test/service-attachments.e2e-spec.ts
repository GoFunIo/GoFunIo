import { INestApplication } from '@nestjs/common';
import { DataSource } from 'typeorm';
import request from 'supertest';
import { App } from 'supertest/types';
import { ATTACHMENT_OBJECT_STORE } from '../src/attachment-storage/attachment-object-store';
import { InMemoryAttachmentObjectStore } from '../src/attachment-storage/in-memory-attachment-object-store';
import { AttachmentObjectCleanup } from '../src/service-attachments/attachment-object-cleanup.entity';
import { MAX_ATTACHMENT_SIZE } from '../src/service-attachments/attachment-file';
import { ServiceAttachment } from '../src/service-attachments/service-attachment.entity';
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
    await createVerifiedUser(app, email, 'Password123!');
    const agent = request.agent(app.getHttpServer());
    await agent
      .post('/auth/signin')
      .send({ email, password: 'Password123!' })
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
    return {
      agent,
      serviceId: service.body.id as string,
      vehicleId: vehicle.body.id as string,
    };
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

  it('downloads, replaces, and idempotently deletes an Attachment', async () => {
    const { agent, serviceId } = await serviceOwner(
      'attachment-item@example.com',
    );
    const created = await agent
      .post(`/services/${serviceId}/attachments`)
      .attach('attachment', Buffer.from('%PDF-original'), {
        filename: 'original.pdf',
        contentType: 'application/pdf',
      })
      .expect(201);
    const item = `/services/${serviceId}/attachments/${created.body.id}`;

    await agent
      .get(item)
      .expect(302)
      .expect('Location', /^memory:\/\/attachment\//);

    const replaced = await agent
      .put(item)
      .attach('attachment', Buffer.from([0xff, 0xd8, 0xff, 0x00]), {
        filename: 'replacement.jpeg',
        contentType: 'image/jpeg',
      })
      .expect(200);
    expect(replaced.body).toMatchObject({
      id: created.body.id,
      name: 'replacement.jpg',
      mimeType: 'image/jpeg',
      size: 4,
      createdAt: created.body.createdAt,
    });

    await agent.delete(item).expect(204);
    await agent.delete(item).expect(204);
    await agent.get(item).expect(404);
  });

  it('keeps the previous file usable after replacement storage failure', async () => {
    const { agent, serviceId } = await serviceOwner(
      'attachment-replace-failure@example.com',
    );
    const created = await agent
      .post(`/services/${serviceId}/attachments`)
      .attach('attachment', Buffer.from('%PDF-original'), {
        filename: 'original.pdf',
        contentType: 'application/pdf',
      })
      .expect(201);
    const item = `/services/${serviceId}/attachments/${created.body.id}`;
    app
      .get<InMemoryAttachmentObjectStore>(ATTACHMENT_OBJECT_STORE)
      .failNext('put');

    await agent
      .put(item)
      .attach('attachment', Buffer.from('%PDF-replacement'), {
        filename: 'replacement.pdf',
        contentType: 'application/pdf',
      })
      .expect(503)
      .expect(({ body }) =>
        expect(body).toMatchObject({
          code: 'ATTACHMENT_STORAGE_UNAVAILABLE',
          field: 'attachment',
        }),
      );
    await agent.get(item).expect(302);
  });

  it('reports a referenced missing object as inconsistent storage', async () => {
    const { agent, serviceId } = await serviceOwner(
      'attachment-missing-object@example.com',
    );
    const created = await agent
      .post(`/services/${serviceId}/attachments`)
      .attach('attachment', Buffer.from('%PDF-missing'), {
        filename: 'missing.pdf',
        contentType: 'application/pdf',
      })
      .expect(201);
    const storage = app.get<InMemoryAttachmentObjectStore>(
      ATTACHMENT_OBJECT_STORE,
    );
    const stored = await storage.list({
      prefix: `service-attachments/`,
    });
    const object = stored.objects.find(({ key }) => key.includes(serviceId));
    expect(object).toBeDefined();
    await storage.delete(object!.key);

    await agent
      .get(`/services/${serviceId}/attachments/${created.body.id}`)
      .expect(503)
      .expect(({ body }) =>
        expect(body).toMatchObject({
          code: 'ATTACHMENT_STORAGE_INCONSISTENT',
          field: 'attachment',
        }),
      );
  });

  it('queues every object before Service and Vehicle cascades hide metadata', async () => {
    const database = app.get(DataSource);
    const attachments = database.getRepository(ServiceAttachment);
    const cleanups = database.getRepository(AttachmentObjectCleanup);

    for (const parent of ['service', 'vehicle'] as const) {
      const owner = await serviceOwner(
        `attachment-${parent}-cascade@example.com`,
      );
      const created = await owner.agent
        .post(`/services/${owner.serviceId}/attachments`)
        .attach('attachment', Buffer.from(`%PDF-${parent}`), {
          filename: `${parent}.pdf`,
          contentType: 'application/pdf',
        })
        .expect(201);
      const before = await attachments.findOneByOrFail({ id: created.body.id });

      await owner.agent
        .delete(
          parent === 'service'
            ? `/services/${owner.serviceId}`
            : `/vehicles/${owner.vehicleId}`,
        )
        .expect(204);

      await expect(
        attachments.findOne({
          where: { id: created.body.id },
          withDeleted: true,
        }),
      ).resolves.toMatchObject({ deletedAt: expect.any(Date) });
      await expect(
        cleanups.findOneBy({ objectKey: before.objectKey }),
      ).resolves.toMatchObject({
        objectKey: before.objectKey,
        completedAt: null,
      });
      await owner.agent
        .get(`/services/${owner.serviceId}/attachments/${created.body.id}`)
        .expect(404);
    }
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
