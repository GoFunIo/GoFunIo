import { Module } from '@nestjs/common';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { UsersModule } from '../users/users.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Notification } from './notification.entity';
import { VehicleDeadlineNotificationDetail } from './vehicle-deadline-notification-detail.entity';
import { NotificationRecipient } from './notification-recipient.entity';
import { NotificationDelivery } from './notification-delivery.entity';
import {
  VehicleDeadlineReconciliation,
  VehicleDeadlineReconciliationStore,
} from './vehicle-deadline-reconciliation';
import { FleetModule } from '../fleet/fleet.module';
import {
  NOTIFICATION_DELIVERY_STORE,
  NotificationDeliveryWorker,
} from './notification-delivery-worker';
import { TypeOrmNotificationDeliveryStore } from './typeorm-notification-delivery-store';
import { ResendNotificationEmailSender } from './resend-notification-email-sender';
import { NOTIFICATION_EMAIL_SENDER } from './notification-email-sender';
import { NOTIFICATION_DELIVERY_TYPE_ADAPTERS } from './notification-delivery-type-adapter';
import { VehicleDeadlineDeliveryTypeAdapter } from './vehicle-deadline-delivery-type-adapter';

@Module({
  imports: [
    UsersModule,
    FleetModule,
    TypeOrmModule.forFeature([
      Notification,
      VehicleDeadlineNotificationDetail,
      NotificationRecipient,
      NotificationDelivery,
    ]),
  ],
  controllers: [NotificationsController],
  providers: [
    NotificationsService,
    VehicleDeadlineReconciliationStore,
    VehicleDeadlineReconciliation,
    VehicleDeadlineDeliveryTypeAdapter,
    {
      provide: NOTIFICATION_DELIVERY_TYPE_ADAPTERS,
      useFactory: (adapter: VehicleDeadlineDeliveryTypeAdapter) => [adapter],
      inject: [VehicleDeadlineDeliveryTypeAdapter],
    },
    TypeOrmNotificationDeliveryStore,
    {
      provide: NOTIFICATION_DELIVERY_STORE,
      useExisting: TypeOrmNotificationDeliveryStore,
    },
    ResendNotificationEmailSender,
    {
      provide: NOTIFICATION_EMAIL_SENDER,
      useExisting: ResendNotificationEmailSender,
    },
    NotificationDeliveryWorker,
  ],
  exports: [
    NotificationsService,
    VehicleDeadlineReconciliation,
    NotificationDeliveryWorker,
  ],
})
export class NotificationsModule {}
