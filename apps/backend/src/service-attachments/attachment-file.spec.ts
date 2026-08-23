import { HttpException } from '@nestjs/common';
import { validateAttachmentFile } from './attachment-file';

describe('validateAttachmentFile', () => {
  it('accepts a PDF and sanitizes its display name', () => {
    const file = validateAttachmentFile({
      originalName: '../invoice\r\n"2026".pdf',
      mimeType: 'application/pdf',
      body: Buffer.from('%PDF-1.7\ncontent'),
    });

    expect(file).toEqual({
      body: Buffer.from('%PDF-1.7\ncontent'),
      extension: 'pdf',
      mimeType: 'application/pdf',
      name: 'invoice 2026.pdf',
      size: 16,
    });
  });

  it.each([
    [undefined, 400, 'ATTACHMENT_REQUIRED'],
    [
      {
        originalName: 'empty.pdf',
        mimeType: 'application/pdf',
        body: Buffer.alloc(0),
      },
      400,
      'ATTACHMENT_CONTENT_INVALID',
    ],
    [
      {
        originalName: 'large.pdf',
        mimeType: 'application/pdf',
        body: Buffer.alloc(10 * 1024 * 1024 + 1),
      },
      413,
      'ATTACHMENT_TOO_LARGE',
    ],
    [
      {
        originalName: 'image.svg',
        mimeType: 'image/svg+xml',
        body: Buffer.from('<svg'),
      },
      415,
      'ATTACHMENT_TYPE_NOT_ALLOWED',
    ],
    [
      {
        originalName: 'fake.pdf',
        mimeType: 'application/pdf',
        body: Buffer.from('not-pdf'),
      },
      400,
      'ATTACHMENT_CONTENT_INVALID',
    ],
  ])('rejects invalid input with %s', (input, status, code) => {
    try {
      validateAttachmentFile(input);
      throw new Error('expected validation to fail');
    } catch (error) {
      expect(error).toBeInstanceOf(HttpException);
      expect((error as HttpException).getStatus()).toBe(status);
      expect((error as HttpException).getResponse()).toMatchObject({
        code,
        field: 'attachment',
      });
    }
  });
});
