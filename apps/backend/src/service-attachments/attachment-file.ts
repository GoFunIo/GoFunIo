import { HttpException, HttpStatus } from '@nestjs/common';
import { extname } from 'path';
import { ServiceAttachmentMimeType } from './service-attachment.entity';

export const MAX_ATTACHMENT_SIZE = 10 * 1024 * 1024;

export interface AttachmentFileInput {
  originalName: string;
  mimeType: string;
  body: Buffer;
}

export interface ValidatedAttachmentFile {
  name: string;
  mimeType: ServiceAttachmentMimeType;
  extension: 'pdf' | 'jpg' | 'png';
  size: number;
  body: Buffer;
}

const TYPES = {
  '.pdf': {
    extension: 'pdf',
    mimeType: ServiceAttachmentMimeType.PDF,
    signature: (body: Buffer) =>
      body.subarray(0, 5).equals(Buffer.from('%PDF-')),
  },
  '.jpg': {
    extension: 'jpg',
    mimeType: ServiceAttachmentMimeType.JPEG,
    signature: (body: Buffer) =>
      body.length >= 3 &&
      body[0] === 0xff &&
      body[1] === 0xd8 &&
      body[2] === 0xff,
  },
  '.jpeg': {
    extension: 'jpg',
    mimeType: ServiceAttachmentMimeType.JPEG,
    signature: (body: Buffer) =>
      body.length >= 3 &&
      body[0] === 0xff &&
      body[1] === 0xd8 &&
      body[2] === 0xff,
  },
  '.png': {
    extension: 'png',
    mimeType: ServiceAttachmentMimeType.PNG,
    signature: (body: Buffer) =>
      body
        .subarray(0, 8)
        .equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
  },
} as const;

export function validateAttachmentFile(
  input?: AttachmentFileInput,
): ValidatedAttachmentFile {
  if (!input) {
    throw attachmentFileError(
      HttpStatus.BAD_REQUEST,
      'ATTACHMENT_REQUIRED',
      'Attachment is required',
    );
  }
  if (input.body.length === 0) {
    throw attachmentFileError(
      HttpStatus.BAD_REQUEST,
      'ATTACHMENT_CONTENT_INVALID',
      'Attachment content is invalid',
    );
  }
  if (input.body.length > MAX_ATTACHMENT_SIZE) {
    throw attachmentFileError(
      HttpStatus.PAYLOAD_TOO_LARGE,
      'ATTACHMENT_TOO_LARGE',
      'Attachment is too large',
    );
  }

  const sourceName =
    input.originalName.normalize('NFC').split(/[\\/]/).at(-1) ?? '';
  const type = TYPES[extname(sourceName).toLowerCase() as keyof typeof TYPES];
  if (!type || input.mimeType !== (type.mimeType as string)) {
    throw attachmentFileError(
      HttpStatus.UNSUPPORTED_MEDIA_TYPE,
      'ATTACHMENT_TYPE_NOT_ALLOWED',
      'Attachment type is not allowed',
    );
  }
  if (!type.signature(input.body)) {
    throw attachmentFileError(
      HttpStatus.BAD_REQUEST,
      'ATTACHMENT_CONTENT_INVALID',
      'Attachment content is invalid',
    );
  }

  const basename = sourceName
    .slice(0, -extname(sourceName).length)
    .replace(/[\p{Cc}"']/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const suffix = `.${type.extension}`;
  const safeBasename = [...(basename || 'attachment')]
    .slice(0, 255 - suffix.length)
    .join('');
  const name = `${safeBasename}${suffix}`;

  return {
    body: input.body,
    extension: type.extension,
    mimeType: type.mimeType,
    name,
    size: input.body.length,
  };
}

function attachmentFileError(
  statusCode: HttpStatus,
  code: string,
  message: string,
): HttpException {
  const error =
    statusCode === HttpStatus.PAYLOAD_TOO_LARGE
      ? 'Payload Too Large'
      : statusCode === HttpStatus.UNSUPPORTED_MEDIA_TYPE
        ? 'Unsupported Media Type'
        : 'Bad Request';
  return new HttpException(
    { statusCode, error, message, code, field: 'attachment' },
    statusCode,
  );
}
