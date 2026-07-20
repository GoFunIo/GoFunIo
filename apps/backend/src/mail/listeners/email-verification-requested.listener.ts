import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { MailService } from '../mail.service';
import {
  EMAIL_VERIFICATION_REQUESTED_EVENT,
  EmailVerificationRequestedEvent,
} from '../../users/events/email-verification-requested.event';

@Injectable()
export class EmailVerificationRequestedListener {
  constructor(private readonly mailService: MailService) {}

  @OnEvent(EMAIL_VERIFICATION_REQUESTED_EVENT, { async: true })
  async handle(event: EmailVerificationRequestedEvent): Promise<void> {
    await this.mailService.sendVerificationEmail(
      event.delivery.email,
      event.delivery.token,
      event.delivery.origin,
    );
  }
}
