import {
  BadRequestException,
  CallHandler,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
  NestInterceptor,
  PayloadTooLargeException,
} from '@nestjs/common';
import { Observable, catchError } from 'rxjs';
import {
  AttachmentStorageInconsistentError,
  AttachmentStorageUnavailableError,
} from '../attachment-storage/attachment-object-store';

@Injectable()
export class AttachmentHttpErrorInterceptor implements NestInterceptor {
  intercept(
    _context: ExecutionContext,
    next: CallHandler,
  ): Observable<unknown> {
    return next.handle().pipe(
      catchError((error: unknown) => {
        if (error instanceof PayloadTooLargeException) {
          throw attachmentHttpError(
            HttpStatus.PAYLOAD_TOO_LARGE,
            'ATTACHMENT_TOO_LARGE',
            'Attachment is too large',
          );
        }
        if (
          error instanceof BadRequestException &&
          ['Too many files', 'Unexpected field'].includes(error.message)
        ) {
          throw attachmentHttpError(
            HttpStatus.BAD_REQUEST,
            'ATTACHMENT_CONTENT_INVALID',
            'Attachment content is invalid',
          );
        }
        if (error instanceof AttachmentStorageInconsistentError) {
          throw attachmentHttpError(
            HttpStatus.SERVICE_UNAVAILABLE,
            error.code,
            'Attachment storage is inconsistent',
          );
        }
        if (error instanceof AttachmentStorageUnavailableError) {
          throw attachmentHttpError(
            HttpStatus.SERVICE_UNAVAILABLE,
            error.code,
            'Attachment storage is unavailable',
          );
        }
        throw error;
      }),
    );
  }
}

function attachmentHttpError(
  statusCode: HttpStatus,
  code: string,
  message: string,
): HttpException {
  return new HttpException(
    {
      statusCode,
      error:
        statusCode === HttpStatus.PAYLOAD_TOO_LARGE
          ? 'Payload Too Large'
          : statusCode === HttpStatus.BAD_REQUEST
            ? 'Bad Request'
            : 'Service Unavailable',
      message,
      code,
      field: 'attachment',
    },
    statusCode,
  );
}
