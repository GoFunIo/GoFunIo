import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AttachmentStorageModule } from '../attachment-storage/attachment-storage.module';
import { FleetModule } from '../fleet/fleet.module';
import { UsersModule } from '../users/users.module';
import { AttachmentObjectCleanup } from './attachment-object-cleanup.entity';
import { AttachmentHttpErrorInterceptor } from './attachment-http-error.interceptor';
import {
  SERVICE_ATTACHMENT_QUERY,
  TypeOrmServiceAttachmentQuery,
} from './service-attachment-query';
import { ServiceAttachment } from './service-attachment.entity';
import {
  ATTACHMENT_CLEANUP_STORE,
  AttachmentCleanupWorker,
  TypeOrmAttachmentCleanupStore,
} from './attachment-cleanup-worker';
import { ServiceAttachmentsController } from './service-attachments.controller';
import { ServiceAttachmentsService } from './service-attachments.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([ServiceAttachment, AttachmentObjectCleanup]),
    AttachmentStorageModule,
    FleetModule,
    UsersModule,
  ],
  controllers: [ServiceAttachmentsController],
  providers: [
    AttachmentHttpErrorInterceptor,
    TypeOrmServiceAttachmentQuery,
    TypeOrmAttachmentCleanupStore,
    AttachmentCleanupWorker,
    ServiceAttachmentsService,
    {
      provide: ATTACHMENT_CLEANUP_STORE,
      useExisting: TypeOrmAttachmentCleanupStore,
    },
    {
      provide: SERVICE_ATTACHMENT_QUERY,
      useExisting: TypeOrmServiceAttachmentQuery,
    },
  ],
  exports: [
    TypeOrmModule,
    SERVICE_ATTACHMENT_QUERY,
    ServiceAttachmentsService,
    AttachmentCleanupWorker,
  ],
})
export class ServiceAttachmentsModule {}
