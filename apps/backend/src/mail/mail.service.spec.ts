import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { getRepositoryToken } from '@nestjs/typeorm';
import { MailService } from './mail.service';
import { FRONTEND_ORIGINS } from '../common/frontend-origins';
import { User } from '../users/users.entity';
import * as templateRenderer from './template-renderer';
import { MAIL_TRANSPORT, type MailTransport } from './mail-transport';

describe('MailService', () => {
  let service: MailService;
  let send: jest.MockedFunction<MailTransport['send']>;
  let renderSpy: jest.SpyInstance;
  let findOne: jest.Mock;

  beforeEach(async () => {
    send = jest.fn().mockResolvedValue({ messageId: 'email_123' });
    findOne = jest.fn().mockResolvedValue(null);
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
              if (key === 'MAIL_FROM') return 'AutoKeep <no-reply@test.com>';
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
        { provide: MAIL_TRANSPORT, useValue: { send } },
        { provide: getRepositoryToken(User), useValue: { findOne } },
      ],
    }).compile();

    service = module.get(MailService);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('sendVerificationEmail renders template and calls the mail transport', async () => {
    await service.sendVerificationEmail({
      email: 'user@example.com',
      token: 'abc123',
      origin: 'http://localhost:5173',
    });

    expect(renderSpy).toHaveBeenCalledWith('verify-email', {
      link: 'http://localhost:5173/verify-email?token=abc123',
      assetBaseUrl: 'http://localhost:5173',
      firstName: undefined,
    });
    expect(send).toHaveBeenCalledWith({
      from: 'AutoKeep <no-reply@test.com>',
      to: 'user@example.com',
      subject: 'Potwierdź swój adres e-mail w AutoKeep',
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
      link: 'http://localhost:5173/reset-password?token=reset456',
      assetBaseUrl: 'http://localhost:5173',
      ttlHours: 24,
      firstName: undefined,
    });
    expect(send).toHaveBeenCalledWith({
      from: 'AutoKeep <no-reply@test.com>',
      to: 'user@example.com',
      subject: 'Zresetuj hasło do AutoKeep',
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
      link: 'http://localhost:5173/reset-password?token=set789',
      assetBaseUrl: 'http://localhost:5173',
      ttlHours: 24,
      firstName: undefined,
    });
    expect(send).toHaveBeenCalledWith({
      from: 'AutoKeep <no-reply@test.com>',
      to: 'google@example.com',
      subject: 'Ustaw hasło do AutoKeep',
      html: '<html>rendered</html>',
    });
  });

  it('looks up the recipient first name by userId and passes it to the template', async () => {
    findOne.mockResolvedValue({ firstName: 'Ada' });

    await service.sendPasswordResetEmail(
      { email: 'user@example.com', token: 't', origin: 'http://localhost:5173' },
      24,
      false,
      'user-1',
    );

    expect(findOne).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      select: { firstName: true },
    });
    expect(renderSpy).toHaveBeenCalledWith(
      'reset-password',
      expect.objectContaining({ firstName: 'Ada' }),
    );
  });

  it('falls back to no first name when the recipient lookup throws', async () => {
    findOne.mockRejectedValue(new Error('db down'));

    await service.sendVerificationEmail(
      { email: 'user@example.com', token: 'abc123' },
      'user-1',
    );

    expect(renderSpy).toHaveBeenCalledWith(
      'verify-email',
      expect.objectContaining({ firstName: undefined }),
    );
    expect(send).toHaveBeenCalled();
  });

  it('sendMembershipInvitation renders the acceptance link and calls Resend', async () => {
    await service.sendMembershipInvitation({
      email: 'invitee@example.com',
      token: 'invite123',
      origin: 'http://localhost:5173/',
    });

    expect(renderSpy).toHaveBeenCalledWith('membership-invitation', {
      link: 'http://localhost:5173/accept-invitation?token=invite123',
      assetBaseUrl: 'http://localhost:5173',
    });
    expect(send).toHaveBeenCalledWith({
      from: 'AutoKeep <no-reply@test.com>',
      to: 'invitee@example.com',
      subject: 'Zaproszenie do zespołu w AutoKeep',
      html: '<html>rendered</html>',
    });
  });

  it('sendVerificationEmail logs and swallows transport errors', async () => {
    send.mockRejectedValue(new Error('secret user@example.com server error'));
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
    expect(send).not.toHaveBeenCalled();
  });
});
