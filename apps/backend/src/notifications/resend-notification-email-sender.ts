import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EnvVars } from '../config/env.validation';
import { sendResendEmail } from '../mail/resend.client';
import {
  NotificationEmailSendInput,
  NotificationEmailSender,
} from './notification-email-sender';

@Injectable()
export class ResendNotificationEmailSender implements NotificationEmailSender {
  private readonly apiKey: string;
  private readonly from: string;

  constructor(config: ConfigService<EnvVars, true>) {
    this.apiKey = config.getOrThrow('RESEND_API_KEY');
    this.from = config.getOrThrow('MAIL_FROM');
  }

  async send(input: NotificationEmailSendInput) {
    const accepted = await sendResendEmail(this.apiKey, {
      from: this.from,
      to: input.to,
      subject: input.subject,
      text: input.text,
      html: input.html,
      idempotencyKey: input.idempotencyKey,
    });
    return { providerMessageId: accepted.id };
  }
}
