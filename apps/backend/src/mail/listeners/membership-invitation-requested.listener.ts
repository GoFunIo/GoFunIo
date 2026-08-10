import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import {
  MEMBERSHIP_INVITATION_REQUESTED_EVENT,
  MembershipInvitationRequestedEvent,
} from '../../users/events/membership-invitation-requested.event';
import { MailService } from '../mail.service';

@Injectable()
export class MembershipInvitationRequestedListener {
  constructor(private readonly mailService: MailService) {}

  @OnEvent(MEMBERSHIP_INVITATION_REQUESTED_EVENT, { async: true })
  async handle(event: MembershipInvitationRequestedEvent): Promise<void> {
    await this.mailService.sendMembershipInvitation(event.delivery);
  }
}
