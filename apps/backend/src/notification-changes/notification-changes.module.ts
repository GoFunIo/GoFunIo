import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificationChangeCleanup } from './notification-change-cleanup';
import { NotificationChangeListener } from './notification-change-listener';
import { NotificationChangeRelay } from './notification-change-relay';
import { NotificationChangeRouter } from './notification-change-router';
import { NotificationChange } from './notification-change.entity';
import { NotificationSseTransport } from './notification-sse-transport';
import { NotificationStreamRegistry } from './notification-stream-registry';
import { MembershipAuthorizationModule } from '../users/membership-authorization.module';

@Global()
@Module({
  imports: [
    TypeOrmModule.forFeature([NotificationChange]),
    MembershipAuthorizationModule,
  ],
  providers: [
    NotificationChangeRelay,
    NotificationStreamRegistry,
    NotificationSseTransport,
    NotificationChangeRouter,
    NotificationChangeListener,
    NotificationChangeCleanup,
  ],
  exports: [
    NotificationChangeRelay,
    NotificationStreamRegistry,
    NotificationSseTransport,
  ],
})
export class NotificationChangesModule {}
