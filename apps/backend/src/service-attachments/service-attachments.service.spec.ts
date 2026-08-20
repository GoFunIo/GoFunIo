import { HttpException, NotFoundException } from '@nestjs/common';
import {
  AttachmentStorageInconsistentError,
  AttachmentStorageUnavailableError,
} from '../attachment-storage/attachment-object-store';
import { InMemoryAttachmentObjectStore } from '../attachment-storage/in-memory-attachment-object-store';
import { FakeFleetUnitOfWork } from '../fleet/fleet-unit-of-work';
import { MembershipRole } from '../users/membership-role';
import type { Repository } from 'typeorm';
import type { DriverAllocation } from '../fleet/driver-allocation';
import type { VehicleAccess } from '../fleet/vehicle-access';
import type { ServiceAttachmentQuery } from './service-attachment-query';
import { ServicesService } from '../services/services.service';
import { Service, ServiceType } from '../services/services.entity';
import { VehiclesService } from '../vehicles/vehicles.service';
import { ServiceAttachmentsService } from './service-attachments.service';

const companyId = 'company-one';
const userId = 'admin-one';
const vehicleId = 'vehicle-one';
const serviceId = 'service-one';
const actor = { id: userId, companyId, role: MembershipRole.ADMIN };
const attachmentQuery = {} as ServiceAttachmentQuery;
const pdf = {
  originalName: 'invoice.pdf',
  mimeType: 'application/pdf',
  body: Buffer.from('%PDF-1.7\ncontent'),
};

describe('ServiceAttachmentsService', () => {
  it('guards an object before upload and cancels the guard with metadata', async () => {
    const fleet = setupFleet();
    const storage = new InMemoryAttachmentObjectStore();
    const put = jest.spyOn(storage, 'put').mockImplementation(async (input) => {
      expect(fleet.attachmentCleanups).toEqual([
        expect.objectContaining({ objectKey: input.key, completedAt: null }),
      ]);
      expect(fleet.transactionActive).toBe(false);
      await InMemoryAttachmentObjectStore.prototype.put.call(storage, input);
    });
    const attachments = new ServiceAttachmentsService(
      fleet,
      storage,
      attachmentQuery,
    );

    const created = await attachments.create(actor, serviceId, pdf);

    expect(created).toMatchObject({
      name: 'invoice.pdf',
      mimeType: 'application/pdf',
      size: 16,
    });
    expect(put).toHaveBeenCalledTimes(1);
    expect(fleet.serviceAttachments).toHaveLength(1);
    expect(fleet.attachmentCleanups).toEqual([]);
    await expect(
      storage.list({
        prefix: `service-attachments/${companyId}/${serviceId}/`,
      }),
    ).resolves.toMatchObject({
      objects: [expect.objectContaining({ size: 16 })],
    });
  });

  it('retains the cleanup guard when upload fails', async () => {
    const fleet = setupFleet();
    const storage = new InMemoryAttachmentObjectStore();
    storage.failNext('put', new AttachmentStorageUnavailableError());
    const attachments = new ServiceAttachmentsService(
      fleet,
      storage,
      attachmentQuery,
    );

    await expect(
      attachments.create(actor, serviceId, pdf),
    ).rejects.toBeInstanceOf(AttachmentStorageUnavailableError);

    expect(fleet.serviceAttachments).toEqual([]);
    expect(fleet.attachmentCleanups).toHaveLength(1);
    expect(fleet.attachmentCleanups[0]).toMatchObject({ completedAt: null });
    expect(fleet.attachmentCleanups[0].objectKey).toMatch(
      new RegExp(`^service-attachments/${companyId}/${serviceId}/`),
    );
  });

  it('retains the uploaded object guard when metadata commit fails', async () => {
    class CommitFailingFleet extends FakeFleetUnitOfWork {
      private transactions = 0;

      override transact<T>(
        work: Parameters<FakeFleetUnitOfWork['transact']>[0],
      ): Promise<T> {
        this.transactions += 1;
        if (this.transactions === 2)
          return Promise.reject(new Error('commit failed'));
        return super.transact(work) as Promise<T>;
      }
    }
    const fleet = setupFleet(new CommitFailingFleet());
    const storage = new InMemoryAttachmentObjectStore();
    const attachments = new ServiceAttachmentsService(
      fleet,
      storage,
      attachmentQuery,
    );

    await expect(attachments.create(actor, serviceId, pdf)).rejects.toThrow(
      'commit failed',
    );

    expect(fleet.serviceAttachments).toEqual([]);
    expect(fleet.attachmentCleanups).toHaveLength(1);
    await expect(
      storage.list({ prefix: 'service-attachments/' }),
    ).resolves.toMatchObject({
      objects: [expect.any(Object)],
    });
  });

  it('does not publish metadata after the cleanup guard is claimed', async () => {
    const fleet = setupFleet();
    const storage = new InMemoryAttachmentObjectStore();
    jest.spyOn(storage, 'put').mockImplementation(async (input) => {
      fleet.attachmentCleanups[0].lockedAt = new Date();
      await InMemoryAttachmentObjectStore.prototype.put.call(storage, input);
    });
    const attachments = new ServiceAttachmentsService(
      fleet,
      storage,
      attachmentQuery,
    );

    await expect(
      attachments.create(actor, serviceId, pdf),
    ).rejects.toBeInstanceOf(AttachmentStorageInconsistentError);

    expect(fleet.serviceAttachments).toEqual([]);
    expect(fleet.attachmentCleanups).toHaveLength(1);
  });

  it('retains the guard if the Service moves during upload', async () => {
    const fleet = setupFleet();
    const storage = new InMemoryAttachmentObjectStore();
    jest.spyOn(storage, 'put').mockImplementation(async (input) => {
      fleet.services[0].vehicleId = 'vehicle-two';
      await InMemoryAttachmentObjectStore.prototype.put.call(storage, input);
    });
    const attachments = new ServiceAttachmentsService(
      fleet,
      storage,
      attachmentQuery,
    );

    await expect(
      attachments.create(actor, serviceId, pdf),
    ).rejects.toBeInstanceOf(NotFoundException);

    expect(fleet.serviceAttachments).toEqual([]);
    expect(fleet.attachmentCleanups).toHaveLength(1);
  });

  it('authorizes download before verifying and signing outside the transaction', async () => {
    const fleet = setupFleet();
    const storage = new InMemoryAttachmentObjectStore();
    const attachments = new ServiceAttachmentsService(
      fleet,
      storage,
      attachmentQuery,
    );
    const created = await attachments.create(actor, serviceId, pdf);
    const createDownloadUrl = jest
      .spyOn(storage, 'createDownloadUrl')
      .mockImplementation(async (input) => {
        expect(fleet.transactionActive).toBe(false);
        expect(input).toMatchObject({
          fileName: 'invoice.pdf',
          expiresInSeconds: 300,
        });
        return new URL('https://download.example/file');
      });

    await expect(
      attachments.download(actor, serviceId, created.id),
    ).resolves.toEqual(new URL('https://download.example/file'));
    expect(createDownloadUrl).toHaveBeenCalledTimes(1);
  });

  it('replaces content under a fresh key and queues the previous object', async () => {
    const fleet = setupFleet();
    const storage = new InMemoryAttachmentObjectStore();
    const attachments = new ServiceAttachmentsService(
      fleet,
      storage,
      attachmentQuery,
    );
    const created = await attachments.create(actor, serviceId, pdf);
    const original = { ...fleet.serviceAttachments[0] };

    const replaced = await attachments.replace(actor, serviceId, created.id, {
      originalName: 'photo.jpeg',
      mimeType: 'image/jpeg',
      body: Buffer.from([0xff, 0xd8, 0xff, 0x00]),
    });

    expect(replaced).toMatchObject({
      id: created.id,
      name: 'photo.jpg',
      mimeType: 'image/jpeg',
      size: 4,
      createdAt: created.createdAt,
    });
    expect(fleet.serviceAttachments[0].objectKey).not.toBe(original.objectKey);
    expect(fleet.attachmentCleanups).toEqual([
      expect.objectContaining({
        objectKey: original.objectKey,
        completedAt: null,
      }),
    ]);
  });

  it('leaves every object recoverable after concurrent replace and delete', async () => {
    const fleet = setupFleet();
    const storage = new InMemoryAttachmentObjectStore();
    const attachments = new ServiceAttachmentsService(
      fleet,
      storage,
      attachmentQuery,
    );
    const created = await attachments.create(actor, serviceId, pdf);

    await Promise.allSettled([
      attachments.replace(actor, serviceId, created.id, {
        originalName: 'replacement.png',
        mimeType: 'image/png',
        body: Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
      }),
      attachments.delete(actor, serviceId, created.id),
    ]);

    expect(
      fleet.serviceAttachments.filter(({ deletedAt }) => !deletedAt),
    ).toEqual([]);
    expect(fleet.attachmentCleanups).toHaveLength(2);
    expect(
      new Set(fleet.attachmentCleanups.map(({ objectKey }) => objectKey)).size,
    ).toBe(2);
  });

  it('soft-deletes idempotently and queues physical cleanup', async () => {
    const fleet = setupFleet();
    const storage = new InMemoryAttachmentObjectStore();
    const attachments = new ServiceAttachmentsService(
      fleet,
      storage,
      attachmentQuery,
    );
    const created = await attachments.create(actor, serviceId, pdf);
    const objectKey = fleet.serviceAttachments[0].objectKey;

    await attachments.delete(actor, serviceId, created.id);
    await attachments.delete(actor, serviceId, created.id);

    expect(fleet.serviceAttachments[0].deletedAt).toBeInstanceOf(Date);
    expect(fleet.attachmentCleanups).toEqual([
      expect.objectContaining({ objectKey, completedAt: null }),
    ]);
    await expect(
      attachments.delete(actor, 'another-service', created.id),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('cascades attachment cleanup through Service and Vehicle deletion', async () => {
    const serviceFleet = setupFleet();
    const serviceAttachments = new ServiceAttachmentsService(
      serviceFleet,
      new InMemoryAttachmentObjectStore(),
      attachmentQuery,
    );
    await serviceAttachments.create(actor, serviceId, pdf);
    const serviceObjectKey = serviceFleet.serviceAttachments[0].objectKey;
    const services = new ServicesService(
      serviceFleet,
      {} as VehicleAccess,
      {} as Repository<Service>,
      {} as ServiceAttachmentQuery,
    );

    await services.remove(actor, serviceId);

    expect(serviceFleet.serviceAttachments[0].deletedAt).toBeInstanceOf(Date);
    expect(serviceFleet.attachmentCleanups).toEqual([
      expect.objectContaining({ objectKey: serviceObjectKey }),
    ]);

    const vehicleFleet = setupFleet();
    const vehicleAttachments = new ServiceAttachmentsService(
      vehicleFleet,
      new InMemoryAttachmentObjectStore(),
      attachmentQuery,
    );
    await vehicleAttachments.create(actor, serviceId, pdf);
    const vehicleObjectKey = vehicleFleet.serviceAttachments[0].objectKey;
    const vehicles = new VehiclesService(
      vehicleFleet,
      {} as VehicleAccess,
      {} as DriverAllocation,
    );

    await vehicles.remove(actor, vehicleId);

    expect(vehicleFleet.serviceAttachments[0].deletedAt).toBeInstanceOf(Date);
    expect(vehicleFleet.attachmentCleanups).toEqual([
      expect.objectContaining({ objectKey: vehicleObjectKey }),
    ]);
  });

  it('serializes concurrent creates and leaves the sixth object guarded', async () => {
    const fleet = setupFleet();
    const storage = new InMemoryAttachmentObjectStore();
    const attachments = new ServiceAttachmentsService(
      fleet,
      storage,
      attachmentQuery,
    );

    const results = await Promise.allSettled(
      Array.from({ length: 6 }, () =>
        attachments.create(actor, serviceId, pdf),
      ),
    );

    expect(results.filter(({ status }) => status === 'fulfilled')).toHaveLength(
      5,
    );
    const rejected = results.find(
      ({ status }) => status === 'rejected',
    ) as PromiseRejectedResult;
    expect(rejected.reason).toBeInstanceOf(HttpException);
    expect((rejected.reason as HttpException).getResponse()).toMatchObject({
      code: 'SERVICE_ATTACHMENT_LIMIT_REACHED',
      field: 'attachment',
    });
    expect(fleet.serviceAttachments).toHaveLength(5);
    expect(fleet.attachmentCleanups).toHaveLength(1);
  });
});

function setupFleet(
  fleet: FakeFleetUnitOfWork = new FakeFleetUnitOfWork(),
): FakeFleetUnitOfWork {
  const now = new Date();
  fleet.memberships.push({
    userId,
    companyId,
    role: MembershipRole.ADMIN,
    status: 'active',
  });
  fleet.vehicles.push({
    id: vehicleId,
    companyId,
    brand: 'Ford',
    model: 'Transit',
    productionYear: null,
    fuelType: null,
    vin: null,
    registrationNumber: 'WA1234',
    currentMileage: null,
    purchaseDate: null,
    ocExpiry: null,
    acExpiry: null,
    technicalInspectionExpiry: null,
    notes: null,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  });
  fleet.services.push({
    id: serviceId,
    companyId,
    vehicleId,
    serviceDate: '2026-08-01',
    type: ServiceType.FULL,
    cost: '100.00',
    providerName: 'Workshop',
    notes: null,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  });
  return fleet;
}
