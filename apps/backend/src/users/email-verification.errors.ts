export class InvalidOrExpiredVerificationTokenError extends Error {
  constructor() {
    super('Invalid or expired token');
    this.name = 'InvalidOrExpiredVerificationTokenError';
  }
}

export class VerificationEmailInUseError extends Error {
  constructor() {
    super('Email already in use');
    this.name = 'VerificationEmailInUseError';
  }
}
