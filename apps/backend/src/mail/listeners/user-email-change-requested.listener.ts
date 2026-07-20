import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import {
  USER_EMAIL_CHANGE_REQUESTED_EVENT,
  UserEmailChangeRequestedEvent,
} from '../../users/events/user-email-change-requested.event';
import { MailService } from '../mail.service';

@Injectable()
export class UserEmailChangeRequestedListener {
  constructor(private readonly mailService: MailService) {}

  @OnEvent(USER_EMAIL_CHANGE_REQUESTED_EVENT, { async: true })
  async handle(event: UserEmailChangeRequestedEvent): Promise<void> {
    await this.mailService.sendEmailChangeVerification(
      event.delivery.email,
      event.delivery.token,
      event.delivery.origin,
    );
  }
}
