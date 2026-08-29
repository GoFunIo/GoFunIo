import { NotificationEmailPolicy } from './notification-types';

export enum DeliveryCancellationReason {
  NOTIFICATION_INVALID = 'notification_invalid',
  MEMBERSHIP_INACTIVE = 'membership_inactive',
  SOURCE_UNAUTHORIZED = 'source_unauthorized',
  EMAIL_POLICY_NONE = 'email_policy_none',
  PREFERENCE_DISABLED = 'preference_disabled',
  NO_VERIFIED_ADDRESS = 'no_verified_address',
}

export interface DeliveryEligibilityInput {
  notificationValid: boolean;
  membershipActive: boolean;
  sourceAuthorized: boolean;
  emailPolicy: NotificationEmailPolicy;
  optionalEmailEnabled: boolean;
  hasRecipientAddress: boolean;
}

export type DeliveryEligibility =
  | { eligible: true }
  | { eligible: false; reason: DeliveryCancellationReason };

export function evaluateDeliveryEligibility(
  input: DeliveryEligibilityInput,
): DeliveryEligibility {
  if (!input.notificationValid) {
    return {
      eligible: false,
      reason: DeliveryCancellationReason.NOTIFICATION_INVALID,
    };
  }
  if (!input.membershipActive) {
    return {
      eligible: false,
      reason: DeliveryCancellationReason.MEMBERSHIP_INACTIVE,
    };
  }
  if (!input.sourceAuthorized) {
    return {
      eligible: false,
      reason: DeliveryCancellationReason.SOURCE_UNAUTHORIZED,
    };
  }
  if (input.emailPolicy === NotificationEmailPolicy.NONE) {
    return {
      eligible: false,
      reason: DeliveryCancellationReason.EMAIL_POLICY_NONE,
    };
  }
  if (
    input.emailPolicy === NotificationEmailPolicy.OPTIONAL &&
    !input.optionalEmailEnabled
  ) {
    return {
      eligible: false,
      reason: DeliveryCancellationReason.PREFERENCE_DISABLED,
    };
  }
  if (!input.hasRecipientAddress) {
    return {
      eligible: false,
      reason: DeliveryCancellationReason.NO_VERIFIED_ADDRESS,
    };
  }
  return { eligible: true };
}
