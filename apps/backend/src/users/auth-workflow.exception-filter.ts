import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';
import { InvalidOrExpiredVerificationTokenError } from './email-verification.errors';
import { InvalidOrExpiredPasswordRecoveryTokenError } from './password-recovery.errors';

@Catch(
  InvalidOrExpiredVerificationTokenError,
  InvalidOrExpiredPasswordRecoveryTokenError,
)
export class AuthWorkflowExceptionFilter implements ExceptionFilter {
  catch(exception: Error, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse<Response>();
    response.status(HttpStatus.BAD_REQUEST).json({
      statusCode: HttpStatus.BAD_REQUEST,
      message: exception.message,
      error: 'Bad Request',
    });
  }
}
