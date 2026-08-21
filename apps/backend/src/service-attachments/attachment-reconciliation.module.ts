import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { join } from 'path';
import { AttachmentStorageModule } from '../attachment-storage/attachment-storage.module';
import { buildTypeOrmOptions } from '../config/database.config';
import { EnvVars, validateEnv } from '../config/env.validation';
import { AttachmentObjectCleanup } from './attachment-object-cleanup.entity';
import { AttachmentReconciliation } from './attachment-reconciliation';
import { ServiceAttachment } from './service-attachment.entity';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnv,
      envFilePath: join(__dirname, '..', '..', '.env'),
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<EnvVars, true>) => ({
        ...buildTypeOrmOptions({
          DATABASE_URL: config.get('DATABASE_URL'),
          DATABASE_SCHEMA: config.get('DATABASE_SCHEMA'),
          DATABASE_SSL: config.get('DATABASE_SSL'),
          DATABASE_SSL_REJECT_UNAUTHORIZED: config.get(
            'DATABASE_SSL_REJECT_UNAUTHORIZED',
          ),
          RUN_MIGRATIONS: config.get('RUN_MIGRATIONS'),
        }),
        entities: [join(__dirname, '..', '**', '*.entity.{ts,js}')],
      }),
    }),
    TypeOrmModule.forFeature([ServiceAttachment, AttachmentObjectCleanup]),
    AttachmentStorageModule,
  ],
  providers: [AttachmentReconciliation],
})
export class AttachmentReconciliationModule {}
