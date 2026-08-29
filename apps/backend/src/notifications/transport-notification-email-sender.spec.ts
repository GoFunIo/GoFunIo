import { ConfigService } from '@nestjs/config';
import type { EnvVars } from '../config/env.validation';
import type { MailTransport } from '../mail/mail-transport';
import { TransportNotificationEmailSender } from './transport-notification-email-sender';

describe('TransportNotificationEmailSender', () => {
  it('adds the configured sender and maps the provider id', async () => {
    const send = jest.fn().mockResolvedValue({ messageId: 'provider_123' });
    const config = {
      getOrThrow: (key: keyof EnvVars) => {
        if (key === 'MAIL_FROM') return 'GoFunIo <sender@example.com>';
        throw new Error(`Unexpected key: ${key}`);
      },
    } as ConfigService<EnvVars, true>;
    const transport: MailTransport = { send };
    const sender = new TransportNotificationEmailSender(config, transport);

    await expect(
      sender.send({
        to: 'recipient@example.com',
        subject: 'Deadline',
        text: 'Text',
        html: '<p>HTML</p>',
        idempotencyKey: '22222222-2222-4222-8222-222222222222',
      }),
    ).resolves.toEqual({ providerMessageId: 'provider_123' });
    expect(send).toHaveBeenCalledWith({
      from: 'GoFunIo <sender@example.com>',
      to: 'recipient@example.com',
      subject: 'Deadline',
      text: 'Text',
      html: '<p>HTML</p>',
      idempotencyKey: '22222222-2222-4222-8222-222222222222',
    });
  });
});
