export const PASSWORD_RESET_REQUESTED_EVENT = 'password-reset.requested';

export class PasswordResetRequestedEvent {
  constructor(
    public readonly userId: number,
    public readonly email: string,
    public readonly token: string,
    public readonly ttlHours: number,
    public readonly origin?: string,
  ) {}
}
