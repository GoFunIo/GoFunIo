export class SessionVersionChangedError extends Error {
  constructor() {
    super('Credentials changed during authentication');
    this.name = 'SessionVersionChangedError';
  }
}
