import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, IsNull, Repository } from 'typeorm';
import {
  ServiceAttachment,
  ServiceAttachmentMimeType,
} from './service-attachment.entity';

export const SERVICE_ATTACHMENT_QUERY = Symbol('SERVICE_ATTACHMENT_QUERY');

export interface ServiceAttachmentView {
  id: string;
  name: string;
  mimeType: ServiceAttachmentMimeType;
  size: number;
  createdAt: Date;
  previewUrl: string | null;
}

export function serviceAttachmentPreviewUrl(
  serviceId: string,
  attachmentId: string,
  mimeType: ServiceAttachmentMimeType,
): string | null {
  if (!isServiceAttachmentPreviewable(mimeType)) return null;

  return `/services/${encodeURIComponent(serviceId)}/attachments/${encodeURIComponent(attachmentId)}/preview`;
}

export function isServiceAttachmentPreviewable(
  mimeType: ServiceAttachmentMimeType,
): boolean {
  return (
    mimeType === ServiceAttachmentMimeType.JPEG ||
    mimeType === ServiceAttachmentMimeType.PNG
  );
}

export interface ServiceAttachmentQuery {
  listActive(
    companyId: string,
    serviceId: string,
  ): Promise<ServiceAttachmentView[]>;
  countActiveByServiceIds(
    companyId: string,
    serviceIds: string[],
  ): Promise<Map<string, number>>;
}

@Injectable()
export class TypeOrmServiceAttachmentQuery implements ServiceAttachmentQuery {
  constructor(
    @InjectRepository(ServiceAttachment)
    private readonly attachments: Repository<ServiceAttachment>,
  ) {}

  async listActive(
    companyId: string,
    serviceId: string,
  ): Promise<ServiceAttachmentView[]> {
    const attachments = await this.attachments.find({
      select: ['id', 'name', 'mimeType', 'size', 'createdAt'],
      where: { companyId, serviceId, deletedAt: IsNull() },
      order: { createdAt: 'DESC', id: 'DESC' },
    });
    return attachments.map(({ id, name, mimeType, size, createdAt }) => ({
      id,
      name,
      mimeType,
      size,
      createdAt,
      previewUrl: serviceAttachmentPreviewUrl(serviceId, id, mimeType),
    }));
  }

  async countActiveByServiceIds(
    companyId: string,
    serviceIds: string[],
  ): Promise<Map<string, number>> {
    if (serviceIds.length === 0) return new Map();

    const counts = await this.attachments
      .createQueryBuilder('attachment')
      .select('attachment.serviceId', 'serviceId')
      .addSelect('COUNT(*)', 'count')
      .where({ companyId, serviceId: In(serviceIds), deletedAt: IsNull() })
      .groupBy('attachment.serviceId')
      .getRawMany<{ serviceId: string; count: string }>();

    return new Map(
      counts.map(({ serviceId, count }) => [serviceId, Number(count)]),
    );
  }
}
