import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { MailService } from '../mail.service';
import {
  USER_REGISTERED_EVENT,
  UserRegisteredEvent,
} from '../../users/events/user-registered.event';

@Injectable()
export class UserRegisteredListener {
  constructor(private readonly mailService: MailService) {}

  @OnEvent(USER_REGISTERED_EVENT, { async: true })
  async handle(event: UserRegisteredEvent): Promise<void> {
    await this.mailService.sendVerificationEmail(event.email, event.token);
  }
}
