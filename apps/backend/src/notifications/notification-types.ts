import { NotificationCategory } from '../notification-preferences/notification-preference.entity';
import { NotificationType } from './notification.entity';
import { VehicleDeadlineKind } from '../alert-policy/vehicle-deadline-alert-policy.entity';

export enum NotificationRecipientBehavior {
  SOURCE_SCOPED = 'SOURCE_SCOPED',
  DIRECT = 'DIRECT',
}
export enum NotificationEmailPolicy {
  NONE = 'NONE',
  OPTIONAL = 'OPTIONAL',
  REQUIRED = 'REQUIRED',
}

export interface NotificationTypeContract<TDetail, TDto> {
  category: NotificationCategory;
  recipientBehavior: NotificationRecipientBehavior;
  emailPolicy: NotificationEmailPolicy;
  rendererVersion: number;
  validityEvaluator: (detail: TDetail) => boolean;
  detailAdapter: (row: unknown) => TDetail;
  dtoRenderer: (detail: TDetail) => TDto;
  emailRenderer: (detail: TDetail) => { subject: string; text: string };
}

export interface VehicleDeadlineDetail {
  vehicleId: string;
  deadlineKind: VehicleDeadlineKind;
  deadlineDate: string;
  leadDay: number;
  registrationNumber: string;
  currentDeadlineDate: string;
  enabled: boolean;
  daysRemaining: number;
  horizon: number;
}

export type VehicleDeadlineNotificationContent = Pick<
  VehicleDeadlineDetail,
  | 'vehicleId'
  | 'deadlineKind'
  | 'deadlineDate'
  | 'leadDay'
  | 'registrationNumber'
>;

const vehicleDeadlineReached: NotificationTypeContract<
  VehicleDeadlineDetail,
  VehicleDeadlineNotificationContent
> = {
  category: NotificationCategory.FLEET_DEADLINES,
  recipientBehavior: NotificationRecipientBehavior.SOURCE_SCOPED,
  emailPolicy: NotificationEmailPolicy.OPTIONAL,
  rendererVersion: 1,
  validityEvaluator: (detail) =>
    detail.enabled &&
    detail.deadlineDate === detail.currentDeadlineDate &&
    detail.daysRemaining <= detail.horizon,
  detailAdapter: (row) => row as VehicleDeadlineDetail,
  dtoRenderer: (detail) => ({
    vehicleId: detail.vehicleId,
    deadlineKind: detail.deadlineKind,
    deadlineDate: detail.deadlineDate,
    leadDay: detail.leadDay,
    registrationNumber: detail.registrationNumber,
  }),
  emailRenderer: (detail) => ({
    subject: `Termin pojazdu ${detail.registrationNumber}`,
    text: `Termin ${detail.deadlineKind} pojazdu ${detail.registrationNumber} przypada ${detail.deadlineDate}.`,
  }),
};

export const NOTIFICATION_TYPES = {
  [NotificationType.VEHICLE_DEADLINE_REACHED]: vehicleDeadlineReached,
} satisfies Record<
  NotificationType,
  NotificationTypeContract<
    VehicleDeadlineDetail,
    VehicleDeadlineNotificationContent
  >
>;
