import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';
import { InvalidOrExpiredVerificationTokenError } from './email-verification.errors';
import { EmailRegistrationEmailInUseError } from './email-registration.errors';
import { InvalidOrExpiredPasswordRecoveryTokenError } from './password-recovery.errors';
import {
  EmailChangeEmailInUseError,
  EmailUnchangedError,
  InvalidCurrentPasswordError,
  InvalidOrExpiredEmailChangeTokenError,
  PasswordRequiredForEmailChangeError,
} from './email-change.errors';
import {
  CredentialChangedError,
  CredentialCurrentPasswordError,
  CredentialEmailNotVerifiedError,
  CredentialPasswordRequiredError,
  CredentialPasswordUnchangedError,
  InvalidCredentialsError,
} from './credential-authentication.errors';
import { SessionVersionChangedError } from './session.errors';
import {
  GoogleAccountConflictError,
  GoogleEmailUnverifiedError,
  GoogleExplicitLinkRequiredError,
  GoogleLinkChangedError,
  InvalidGoogleIdentityError,
  InvalidGoogleLinkCredentialsError,
} from './google-authentication.errors';

@Catch(
  InvalidOrExpiredVerificationTokenError,
  EmailRegistrationEmailInUseError,
  InvalidOrExpiredPasswordRecoveryTokenError,
  InvalidOrExpiredEmailChangeTokenError,
  EmailChangeEmailInUseError,
  InvalidCurrentPasswordError,
  PasswordRequiredForEmailChangeError,
  EmailUnchangedError,
  InvalidCredentialsError,
  CredentialEmailNotVerifiedError,
  CredentialPasswordRequiredError,
  CredentialCurrentPasswordError,
  CredentialChangedError,
  CredentialPasswordUnchangedError,
  SessionVersionChangedError,
  InvalidGoogleIdentityError,
  GoogleAccountConflictError,
  GoogleEmailUnverifiedError,
  GoogleExplicitLinkRequiredError,
  InvalidGoogleLinkCredentialsError,
  GoogleLinkChangedError,
)
export class AuthWorkflowExceptionFilter implements ExceptionFilter {
  catch(exception: Error, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse<Response>();
    const status =
      exception instanceof EmailChangeEmailInUseError ||
      exception instanceof PasswordRequiredForEmailChangeError ||
      exception instanceof CredentialPasswordRequiredError ||
      exception instanceof GoogleAccountConflictError ||
      exception instanceof GoogleEmailUnverifiedError ||
      exception instanceof GoogleExplicitLinkRequiredError ||
      exception instanceof GoogleLinkChangedError
        ? HttpStatus.CONFLICT
        : exception instanceof InvalidCurrentPasswordError ||
            exception instanceof InvalidCredentialsError ||
            exception instanceof CredentialEmailNotVerifiedError ||
            exception instanceof CredentialCurrentPasswordError ||
            exception instanceof CredentialChangedError ||
            exception instanceof SessionVersionChangedError ||
            exception instanceof InvalidGoogleIdentityError ||
            exception instanceof InvalidGoogleLinkCredentialsError
          ? HttpStatus.UNAUTHORIZED
          : HttpStatus.BAD_REQUEST;
    response.status(status).json({
      statusCode: status,
      message: exception.message,
      error:
        status === HttpStatus.CONFLICT
          ? 'Conflict'
          : status === HttpStatus.UNAUTHORIZED
            ? 'Unauthorized'
            : 'Bad Request',
    });
  }
}
