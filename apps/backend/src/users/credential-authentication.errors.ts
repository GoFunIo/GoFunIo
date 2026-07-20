export class InvalidCredentialsError extends Error {
  constructor() {
    super('Invalid credentials');
    this.name = 'InvalidCredentialsError';
  }
}

export class CredentialEmailNotVerifiedError extends Error {
  constructor() {
    super('Email not verified');
    this.name = 'CredentialEmailNotVerifiedError';
  }
}

export class CredentialPasswordRequiredError extends Error {
  constructor() {
    super('Use password reset to set a password');
    this.name = 'CredentialPasswordRequiredError';
  }
}

export class CredentialCurrentPasswordError extends Error {
  constructor() {
    super('Invalid current password');
    this.name = 'CredentialCurrentPasswordError';
  }
}

export class CredentialChangedError extends Error {
  constructor() {
    super('Current password changed');
    this.name = 'CredentialChangedError';
  }
}

export class CredentialPasswordUnchangedError extends Error {
  constructor() {
    super('New password must be different');
    this.name = 'CredentialPasswordUnchangedError';
  }
}
