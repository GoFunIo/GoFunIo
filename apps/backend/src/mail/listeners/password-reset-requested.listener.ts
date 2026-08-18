import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { MailService } from '../mail.service';
import {
  PASSWORD_RESET_REQUESTED_EVENT,
  PasswordResetRequestedEvent,
} from '../../users/events/password-reset-requested.event';

@Injectable()
export class PasswordResetRequestedListener {
  constructor(private readonly mailService: MailService) {}

  @OnEvent(PASSWORD_RESET_REQUESTED_EVENT, { async: true })
  async handle(event: PasswordResetRequestedEvent): Promise<void> {
    await this.mailService.sendPasswordResetEmail(
      event.delivery,
      event.ttlHours,
      event.isFirstPassword,
    );
  }
}
