export class EmailRegistrationEmailInUseError extends Error {
  constructor() {
    super('Email already in use');
    this.name = 'EmailRegistrationEmailInUseError';
  }
}
