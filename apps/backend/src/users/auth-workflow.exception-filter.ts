import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';
import {
  InvalidOrExpiredVerificationTokenError,
  VerificationEmailInUseError,
} from './email-verification.errors';
import { InvalidOrExpiredPasswordRecoveryTokenError } from './password-recovery.errors';
import {
  EmailChangeEmailInUseError,
  EmailUnchangedError,
  InvalidCurrentPasswordError,
  InvalidOrExpiredEmailChangeTokenError,
  PasswordRequiredForEmailChangeError,
} from './email-change.errors';

@Catch(
  InvalidOrExpiredVerificationTokenError,
  VerificationEmailInUseError,
  InvalidOrExpiredPasswordRecoveryTokenError,
  InvalidOrExpiredEmailChangeTokenError,
  EmailChangeEmailInUseError,
  InvalidCurrentPasswordError,
  PasswordRequiredForEmailChangeError,
  EmailUnchangedError,
)
export class AuthWorkflowExceptionFilter implements ExceptionFilter {
  catch(exception: Error, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse<Response>();
    const status =
      exception instanceof EmailChangeEmailInUseError ||
      exception instanceof PasswordRequiredForEmailChangeError
        ? HttpStatus.CONFLICT
        : exception instanceof InvalidCurrentPasswordError
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
