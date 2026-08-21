import { Expose } from 'class-transformer';
import { ServiceAttachmentMimeType } from '../service-attachment.entity';

export class AttachmentDto {
  @Expose()
  id!: string;

  @Expose()
  name!: string;

  @Expose()
  mimeType!: ServiceAttachmentMimeType;

  @Expose()
  size!: number;

  @Expose()
  createdAt!: string;
}
