import type { TokenDelivery } from './token-delivery';

export const USER_EMAIL_CHANGE_REQUESTED_EVENT = 'user.email-change-requested';

export class UserEmailChangeRequestedEvent {
  constructor(public readonly delivery: TokenDelivery) {}
}
