export const USER_REGISTERED_EVENT = 'user.registered';

export class UserRegisteredEvent {
  constructor(
    public readonly userId: string,
    public readonly email: string,
    public readonly token: string,
    public readonly origin?: string,
  ) {}
}
