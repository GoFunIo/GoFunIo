import { Inject, Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import {
  ATTACHMENT_OBJECT_STORE,
  type AttachmentObjectStore,
  AttachmentStorageInconsistentError,
} from '../attachment-storage/attachment-object-store';
import { ConflictCode, conflictException } from '../common/conflict';
import {
  FLEET_UNIT_OF_WORK,
  type FleetServiceAttachment,
  type FleetUnitOfWork,
} from '../fleet/fleet-unit-of-work';
import {
  requireCompanyId,
  type SessionPrincipal,
} from '../users/session-principal';
import {
  type AttachmentFileInput,
  validateAttachmentFile,
} from './attachment-file';
import {
  SERVICE_ATTACHMENT_QUERY,
  type ServiceAttachmentQuery,
  type ServiceAttachmentView,
} from './service-attachment-query';

const PUBLISH_GUARD_MS = 60 * 60 * 1000;
const ATTACHMENT_LIMIT = 5;

@Injectable()
export class ServiceAttachmentsService {
  constructor(
    @Inject(FLEET_UNIT_OF_WORK) private readonly fleet: FleetUnitOfWork,
    @Inject(ATTACHMENT_OBJECT_STORE)
    private readonly objects: AttachmentObjectStore,
    @Inject(SERVICE_ATTACHMENT_QUERY)
    private readonly query: ServiceAttachmentQuery,
  ) {}

  async list(
    actor: SessionPrincipal,
    serviceId: string,
  ): Promise<ServiceAttachmentView[]> {
    const companyId = requireCompanyId(actor);
    await this.fleet.transact(async (fleet) => {
      const service = await fleet.services.find(companyId, serviceId);
      await fleet.vehicleAccess.find(actor, service.vehicleId);
    });
    return this.query.listActive(companyId, serviceId);
  }

  async create(
    actor: SessionPrincipal,
    serviceId: string,
    input?: AttachmentFileInput,
  ): Promise<ServiceAttachmentView> {
    const file = validateAttachmentFile(input);
    const companyId = requireCompanyId(actor);
    const objectKey = attachmentObjectKey(companyId, serviceId, file.extension);
    const vehicleId = await this.fleet.transact(async (fleet) => {
      const service = await fleet.services.find(companyId, serviceId);
      await fleet.vehicleAccess.find(actor, service.vehicleId);
      await fleet.attachmentCleanups.guard(
        objectKey,
        new Date(Date.now() + PUBLISH_GUARD_MS),
      );
      return service.vehicleId;
    });

    await this.objects.put({
      key: objectKey,
      body: file.body,
      mimeType: file.mimeType,
    });

    const attachment = await this.fleet.transact(async (fleet) => {
      // Fleet mutations lock Vehicle → Service → Attachment everywhere.
      await fleet.vehicleAccess.find(actor, vehicleId, true);
      await fleet.services.find(companyId, serviceId, true, vehicleId);
      if (
        (await fleet.attachments.countActive(companyId, serviceId)) >=
        ATTACHMENT_LIMIT
      ) {
        throw conflictException(
          'Service attachment limit reached',
          ConflictCode.SERVICE_ATTACHMENT_LIMIT_REACHED,
          'attachment',
        );
      }
      const created = await fleet.attachments.create({
        companyId,
        serviceId,
        objectKey,
        name: file.name,
        mimeType: file.mimeType,
        size: file.size,
      });
      if (!(await fleet.attachmentCleanups.cancel(objectKey, new Date()))) {
        throw new AttachmentStorageInconsistentError();
      }
      return created;
    });

    return attachmentView(attachment);
  }

  async replace(
    actor: SessionPrincipal,
    serviceId: string,
    attachmentId: string,
    input?: AttachmentFileInput,
  ): Promise<ServiceAttachmentView> {
    const file = validateAttachmentFile(input);
    const companyId = requireCompanyId(actor);
    const objectKey = attachmentObjectKey(companyId, serviceId, file.extension);
    const vehicleId = await this.fleet.transact(async (fleet) => {
      const service = await fleet.services.find(companyId, serviceId);
      await fleet.vehicleAccess.find(actor, service.vehicleId);
      await fleet.attachments.find(companyId, serviceId, attachmentId);
      await fleet.attachmentCleanups.guard(
        objectKey,
        new Date(Date.now() + PUBLISH_GUARD_MS),
      );
      return service.vehicleId;
    });

    await this.objects.put({
      key: objectKey,
      body: file.body,
      mimeType: file.mimeType,
    });

    const attachment = await this.fleet.transact(async (fleet) => {
      await fleet.vehicleAccess.find(actor, vehicleId, true);
      await fleet.services.find(companyId, serviceId, true, vehicleId);
      const previous = await fleet.attachments.find(
        companyId,
        serviceId,
        attachmentId,
        true,
      );
      const previousObjectKey = previous.objectKey;
      const replaced = await fleet.attachments.update(attachmentId, {
        objectKey,
        name: file.name,
        mimeType: file.mimeType,
        size: file.size,
      });
      if (!(await fleet.attachmentCleanups.cancel(objectKey, new Date()))) {
        throw new AttachmentStorageInconsistentError();
      }
      await fleet.attachmentCleanups.enqueue(previousObjectKey, new Date());
      return replaced;
    });

    return attachmentView(attachment);
  }

  async delete(
    actor: SessionPrincipal,
    serviceId: string,
    attachmentId: string,
  ): Promise<void> {
    const companyId = requireCompanyId(actor);
    await this.fleet.transact(async (fleet) => {
      const service = await fleet.services.find(companyId, serviceId);
      await fleet.vehicleAccess.find(actor, service.vehicleId, true);
      await fleet.services.find(companyId, serviceId, true, service.vehicleId);
      const attachment = await fleet.attachments.find(
        companyId,
        serviceId,
        attachmentId,
        true,
        true,
      );
      if (attachment.deletedAt) return;
      await fleet.attachmentCleanups.enqueue(attachment.objectKey, new Date());
      await fleet.attachments.softDelete(attachmentId);
    });
  }
}

export function attachmentObjectKey(
  companyId: string,
  serviceId: string,
  extension: 'pdf' | 'jpg' | 'png',
): string {
  return `service-attachments/${companyId}/${serviceId}/${randomUUID()}.${extension}`;
}

function attachmentView(
  attachment: FleetServiceAttachment,
): ServiceAttachmentView {
  return {
    id: attachment.id,
    name: attachment.name,
    mimeType: attachment.mimeType,
    size: attachment.size,
    createdAt: attachment.createdAt,
  };
}
