export class InvalidOrExpiredPasswordRecoveryTokenError extends Error {
  constructor() {
    super('Invalid or expired token');
    this.name = 'InvalidOrExpiredPasswordRecoveryTokenError';
  }
}
