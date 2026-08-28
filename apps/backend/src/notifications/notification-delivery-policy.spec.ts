import { NotificationEmailPolicy } from './notification-types';
import {
  DeliveryCancellationReason,
  evaluateDeliveryEligibility,
} from './notification-delivery-policy';

const eligible = {
  notificationValid: true,
  membershipActive: true,
  sourceAuthorized: true,
  emailPolicy: NotificationEmailPolicy.OPTIONAL,
  optionalEmailEnabled: true,
  hasRecipientAddress: true,
};

describe('evaluateDeliveryEligibility', () => {
  it.each([
    ['notificationValid', DeliveryCancellationReason.NOTIFICATION_INVALID],
    ['membershipActive', DeliveryCancellationReason.MEMBERSHIP_INACTIVE],
    ['sourceAuthorized', DeliveryCancellationReason.SOURCE_UNAUTHORIZED],
    ['optionalEmailEnabled', DeliveryCancellationReason.PREFERENCE_DISABLED],
    ['hasRecipientAddress', DeliveryCancellationReason.NO_VERIFIED_ADDRESS],
  ] as const)('cancels when %s is false', (field, reason) => {
    expect(
      evaluateDeliveryEligibility({ ...eligible, [field]: false }),
    ).toEqual({ eligible: false, reason });
  });

  it('cancels when the Notification Type does not support e-mail', () => {
    expect(
      evaluateDeliveryEligibility({
        ...eligible,
        emailPolicy: NotificationEmailPolicy.NONE,
      }),
    ).toEqual({
      eligible: false,
      reason: DeliveryCancellationReason.EMAIL_POLICY_NONE,
    });
  });

  it('does not apply an optional preference to required e-mail', () => {
    expect(
      evaluateDeliveryEligibility({
        ...eligible,
        emailPolicy: NotificationEmailPolicy.REQUIRED,
        optionalEmailEnabled: false,
      }),
    ).toEqual({ eligible: true });
  });
});
