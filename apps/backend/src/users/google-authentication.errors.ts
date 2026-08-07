export class InvalidGoogleIdentityError extends Error {
  constructor() {
    super('Invalid Google token');
  }
}

export class GoogleAccountConflictError extends Error {
  constructor() {
    super('Google account conflict');
  }
}

export class GoogleEmailUnverifiedError extends Error {
  constructor() {
    super('Verify email before linking Google');
  }
}

export class GoogleExplicitLinkRequiredError extends Error {
  constructor() {
    super('Sign in with password before linking Google');
  }
}

export class InvalidGoogleLinkCredentialsError extends Error {
  constructor() {
    super('Invalid Google link credentials');
  }
}

export class GoogleLinkChangedError extends Error {
  constructor() {
    super('Google link changed concurrently');
  }
}
