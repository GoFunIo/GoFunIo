import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { MailService } from './mail.service';
import { FrontendUrlResolver } from '../common/frontend-url.resolver';
import * as resendClient from './resend.client';
import * as templateRenderer from './template-renderer';

describe('MailService', () => {
  let service: MailService;
  let sendSpy: jest.SpyInstance;
  let renderSpy: jest.SpyInstance;

  beforeEach(async () => {
    sendSpy = jest
      .spyOn(resendClient, 'sendResendEmail')
      .mockResolvedValue({ id: 'email_123' });
    renderSpy = jest
      .spyOn(templateRenderer, 'renderMailTemplate')
      .mockReturnValue('<html>rendered</html>');

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MailService,
        {
          provide: ConfigService,
          useValue: {
            getOrThrow: (key: string) => {
              if (key === 'RESEND_API_KEY') return 're_test';
              if (key === 'MAIL_FROM') return 'GoFunIo <no-reply@test.com>';
              throw new Error(`Unexpected config key: ${key}`);
            },
          },
        },
        {
          provide: FrontendUrlResolver,
          useValue: {
            resolve: (origin?: string) => origin ?? 'http://localhost:5173',
          },
        },
      ],
    }).compile();

    service = module.get(MailService);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('sendVerificationEmail renders template and calls Resend', async () => {
    await service.sendVerificationEmail(
      'user@example.com',
      'abc123',
      'http://localhost:5173',
    );

    expect(renderSpy).toHaveBeenCalledWith('verify-email', {
      verificationUrl: 'http://localhost:5173/verify-email?token=abc123',
    });
    expect(sendSpy).toHaveBeenCalledWith('re_test', {
      from: 'GoFunIo <no-reply@test.com>',
      to: 'user@example.com',
      subject: 'Verify your GoFunIo email',
      html: '<html>rendered</html>',
    });
  });

  it('sendPasswordResetEmail renders template and calls Resend', async () => {
    await service.sendPasswordResetEmail(
      'user@example.com',
      'reset456',
      24,
      'http://localhost:5173',
    );

    expect(renderSpy).toHaveBeenCalledWith('reset-password', {
      resetUrl: 'http://localhost:5173/reset-password?token=reset456',
      ttlHours: 24,
    });
    expect(sendSpy).toHaveBeenCalledWith('re_test', {
      from: 'GoFunIo <no-reply@test.com>',
      to: 'user@example.com',
      subject: 'Reset your GoFunIo password',
      html: '<html>rendered</html>',
    });
  });

  it('sendVerificationEmail logs and swallows Resend errors', async () => {
    sendSpy.mockRejectedValue(new Error('Resend API 500: server error'));
    const errorSpy = jest.spyOn(service['logger'], 'error');

    await expect(
      service.sendVerificationEmail('user@example.com', 'abc123'),
    ).resolves.toBeUndefined();

    expect(errorSpy).toHaveBeenCalled();
  });
});
