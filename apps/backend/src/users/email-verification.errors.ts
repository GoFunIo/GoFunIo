export class InvalidOrExpiredVerificationTokenError extends Error {
  constructor() {
    super('Invalid or expired token');
    this.name = 'InvalidOrExpiredVerificationTokenError';
  }
}
