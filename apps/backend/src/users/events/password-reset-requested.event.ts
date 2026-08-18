import type { TokenDelivery } from './token-delivery';

export const PASSWORD_RESET_REQUESTED_EVENT = 'password-reset.requested';

export class PasswordResetRequestedEvent {
  constructor(
    public readonly userId: string,
    public readonly delivery: TokenDelivery,
    public readonly ttlHours: number,
    public readonly isFirstPassword = false,
  ) {}
}
