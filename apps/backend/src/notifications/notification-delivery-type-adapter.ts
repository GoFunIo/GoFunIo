import type { EntityManager } from 'typeorm';
import type { RenderedNotificationEmail } from './notification-email-renderer';
import type { NotificationType } from './notification.entity';

export const NOTIFICATION_DELIVERY_TYPE_ADAPTERS = Symbol(
  'NOTIFICATION_DELIVERY_TYPE_ADAPTERS',
);

export interface NotificationDeliveryTypePreparation {
  sourceValid: boolean;
  sourceAuthorized: boolean;
  rendered?: RenderedNotificationEmail;
}

export interface NotificationDeliveryTypeAdapter {
  readonly type: NotificationType;
  prepare(
    manager: EntityManager,
    input: {
      companyId: string;
      notificationId: string;
      membershipId: string;
      userId: string | null;
      rendererVersion: number;
      frontendBaseUrl: string;
    },
  ): Promise<NotificationDeliveryTypePreparation>;
}
