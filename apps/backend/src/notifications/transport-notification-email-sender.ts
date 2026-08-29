import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EnvVars } from '../config/env.validation';
import { MAIL_TRANSPORT, type MailTransport } from '../mail/mail-transport';
import {
  NotificationEmailSendInput,
  NotificationEmailSender,
} from './notification-email-sender';

@Injectable()
export class TransportNotificationEmailSender implements NotificationEmailSender {
  private readonly from: string;

  constructor(
    config: ConfigService<EnvVars, true>,
    @Inject(MAIL_TRANSPORT) private readonly transport: MailTransport,
  ) {
    this.from = config.getOrThrow('MAIL_FROM');
  }

  async send(input: NotificationEmailSendInput) {
    const accepted = await this.transport.send({
      from: this.from,
      ...input,
    });
    return { providerMessageId: accepted.messageId };
  }
}
