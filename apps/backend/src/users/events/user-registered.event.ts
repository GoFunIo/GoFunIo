export const USER_REGISTERED_EVENT = 'user.registered';

export class UserRegisteredEvent {
  constructor(
    public readonly userId: number,
    public readonly email: string,
    public readonly token: string,
  ) {}
}
