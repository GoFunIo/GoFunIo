export const USER_EMAIL_CHANGE_REQUESTED_EVENT = 'user.email-change-requested';

export class UserEmailChangeRequestedEvent {
  constructor(
    public readonly email: string,
    public readonly token: string,
    public readonly origin?: string,
  ) {}
}
