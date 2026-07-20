export class EmailChangeEmailInUseError extends Error {
  constructor() {
    super('Email already in use');
    this.name = 'EmailChangeEmailInUseError';
  }
}

export class InvalidOrExpiredEmailChangeTokenError extends Error {
  constructor() {
    super('Invalid or expired token');
    this.name = 'InvalidOrExpiredEmailChangeTokenError';
  }
}

export class InvalidCurrentPasswordError extends Error {
  constructor() {
    super('Invalid current password');
    this.name = 'InvalidCurrentPasswordError';
  }
}

export class PasswordRequiredForEmailChangeError extends Error {
  constructor() {
    super('Set a password before changing email');
    this.name = 'PasswordRequiredForEmailChangeError';
  }
}

export class EmailUnchangedError extends Error {
  constructor() {
    super('Email unchanged');
    this.name = 'EmailUnchangedError';
  }
}
