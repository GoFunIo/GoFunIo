import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { MailService } from './mail.service';
import { FRONTEND_ORIGINS } from '../common/frontend-origins';
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
          provide: FRONTEND_ORIGINS,
          useValue: {
            resolveLinkBase: (origin?: string) =>
              origin?.replace(/\/$/, '') ?? 'http://localhost:5173',
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
    await service.sendVerificationEmail({
      email: 'user@example.com',
      token: 'abc123',
      origin: 'http://localhost:5173',
    });

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
      {
        email: 'user@example.com',
        token: 'reset456',
        origin: 'http://localhost:5173',
      },
      24,
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

  it('sendPasswordResetEmail uses set-password template for first password', async () => {
    await service.sendPasswordResetEmail(
      {
        email: 'google@example.com',
        token: 'set789',
        origin: 'http://localhost:5173',
      },
      24,
      true,
    );

    expect(renderSpy).toHaveBeenCalledWith('set-password', {
      resetUrl: 'http://localhost:5173/reset-password?token=set789',
      ttlHours: 24,
    });
    expect(sendSpy).toHaveBeenCalledWith('re_test', {
      from: 'GoFunIo <no-reply@test.com>',
      to: 'google@example.com',
      subject: 'Set your GoFunIo password',
      html: '<html>rendered</html>',
    });
  });

  it('sendMembershipInvitation renders the acceptance link and calls Resend', async () => {
    await service.sendMembershipInvitation({
      email: 'invitee@example.com',
      token: 'invite123',
      origin: 'http://localhost:5173/',
    });

    expect(renderSpy).toHaveBeenCalledWith('membership-invitation', {
      acceptUrl: 'http://localhost:5173/accept-invitation?token=invite123',
    });
    expect(sendSpy).toHaveBeenCalledWith('re_test', {
      from: 'GoFunIo <no-reply@test.com>',
      to: 'invitee@example.com',
      subject: 'You were invited to a GoFunIo workspace',
      html: '<html>rendered</html>',
    });
  });

  it('sendVerificationEmail logs and swallows Resend errors', async () => {
    sendSpy.mockRejectedValue(
      new Error('secret user@example.com server error'),
    );
    const errorSpy = jest.spyOn(service['logger'], 'error');

    await expect(
      service.sendVerificationEmail({
        email: 'user@example.com',
        token: 'abc123',
      }),
    ).resolves.toBeUndefined();

    expect(errorSpy).toHaveBeenCalledTimes(1);
    const [log] = errorSpy.mock.calls[0] as [Record<string, unknown>];
    expect(log).toMatchObject({
      event: 'mail.delivery_failed',
      template: 'verify-email',
      errorType: 'Error',
    });
    expect(JSON.stringify(log)).not.toContain('user@example.com');
    expect(JSON.stringify(log)).not.toContain('secret');
  });

  it('does not swallow template rendering errors', async () => {
    renderSpy.mockImplementation(() => {
      throw new Error('broken template');
    });

    await expect(
      service.sendVerificationEmail({
        email: 'user@example.com',
        token: 'abc123',
      }),
    ).rejects.toThrow('broken template');
    expect(sendSpy).not.toHaveBeenCalled();
  });
});
