import type { TokenDelivery } from './token-delivery';

export const EMAIL_VERIFICATION_REQUESTED_EVENT =
  'email-verification.requested';

export class EmailVerificationRequestedEvent {
  constructor(
    public readonly userId: string,
    public readonly delivery: TokenDelivery,
  ) {}
}
