import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';
import { InvalidOrExpiredVerificationTokenError } from './email-verification.errors';

@Catch(InvalidOrExpiredVerificationTokenError)
export class EmailVerificationExceptionFilter implements ExceptionFilter {
  catch(
    exception: InvalidOrExpiredVerificationTokenError,
    host: ArgumentsHost,
  ) {
    const response = host.switchToHttp().getResponse<Response>();
    response.status(HttpStatus.BAD_REQUEST).json({
      statusCode: HttpStatus.BAD_REQUEST,
      message: exception.message,
      error: 'Bad Request',
    });
  }
}
