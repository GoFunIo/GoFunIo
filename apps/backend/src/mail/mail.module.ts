import { Module } from '@nestjs/common';
import { MailService } from './mail.service';
import { EmailVerificationRequestedListener } from './listeners/email-verification-requested.listener';
import { PasswordResetRequestedListener } from './listeners/password-reset-requested.listener';
import { UserEmailChangeRequestedListener } from './listeners/user-email-change-requested.listener';
import { MembershipInvitationRequestedListener } from './listeners/membership-invitation-requested.listener';

@Module({
  providers: [
    MailService,
    EmailVerificationRequestedListener,
    PasswordResetRequestedListener,
    UserEmailChangeRequestedListener,
    MembershipInvitationRequestedListener,
  ],
  exports: [MailService],
})
export class MailModule {}
