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
import { ConflictCode } from '../common/conflict';

function getConflictCode(exception: Error): ConflictCode | undefined {
  if (exception instanceof EmailChangeEmailInUseError)
    return ConflictCode.EMAIL_IN_USE;
  if (exception instanceof PasswordRequiredForEmailChangeError)
    return ConflictCode.SET_PASSWORD_BEFORE_EMAIL_CHANGE;
  if (exception instanceof CredentialPasswordRequiredError)
    return ConflictCode.USE_PASSWORD_RESET_TO_SET_PASSWORD;
  if (exception instanceof GoogleAccountConflictError)
    return ConflictCode.GOOGLE_ACCOUNT_CONFLICT;
  if (exception instanceof GoogleEmailUnverifiedError)
    return ConflictCode.VERIFY_EMAIL_BEFORE_GOOGLE_LINK;
  if (exception instanceof GoogleExplicitLinkRequiredError)
    return ConflictCode.SIGN_IN_BEFORE_GOOGLE_LINK;
  if (exception instanceof GoogleLinkChangedError)
    return ConflictCode.GOOGLE_LINK_CHANGED_CONCURRENTLY;
  return undefined;
}

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
    const conflictCode = getConflictCode(exception);
    const status = conflictCode
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
      ...(conflictCode ? { code: conflictCode } : {}),
      ...(exception instanceof EmailChangeEmailInUseError && exception.field
        ? { field: exception.field }
        : {}),
    });
  }
}
