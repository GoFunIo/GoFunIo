import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AttachmentObjectCleanup } from './attachment-object-cleanup.entity';
import {
  SERVICE_ATTACHMENT_QUERY,
  TypeOrmServiceAttachmentQuery,
} from './service-attachment-query';
import { ServiceAttachment } from './service-attachment.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([ServiceAttachment, AttachmentObjectCleanup]),
  ],
  providers: [
    TypeOrmServiceAttachmentQuery,
    {
      provide: SERVICE_ATTACHMENT_QUERY,
      useExisting: TypeOrmServiceAttachmentQuery,
    },
  ],
  exports: [TypeOrmModule, SERVICE_ATTACHMENT_QUERY],
})
export class ServiceAttachmentsModule {}
