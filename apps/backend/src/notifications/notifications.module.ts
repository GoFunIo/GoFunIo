import { Module } from '@nestjs/common';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { UsersModule } from '../users/users.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Notification } from './notification.entity';
import { VehicleDeadlineNotificationDetail } from './vehicle-deadline-notification-detail.entity';
import { NotificationRecipient } from './notification-recipient.entity';
import { NotificationDelivery } from './notification-delivery.entity';
import { VehicleDeadlineNotificationWriter } from './vehicle-deadline-notification-writer';
import {
  VehicleDeadlineReconciliation,
  VehicleDeadlineReconciliationStore,
} from './vehicle-deadline-reconciliation';

@Module({
  imports: [
    UsersModule,
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
    VehicleDeadlineNotificationWriter,
    VehicleDeadlineReconciliationStore,
    VehicleDeadlineReconciliation,
  ],
  exports: [NotificationsService, VehicleDeadlineReconciliation],
})
export class NotificationsModule {}
