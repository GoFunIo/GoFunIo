import { Module } from '@nestjs/common';
import { MailService } from './mail.service';
import { EmailVerificationRequestedListener } from './listeners/email-verification-requested.listener';
import { PasswordResetRequestedListener } from './listeners/password-reset-requested.listener';
import { FrontendUrlResolver } from '../common/frontend-url.resolver';
import { UserEmailChangeRequestedListener } from './listeners/user-email-change-requested.listener';

@Module({
  providers: [
    MailService,
    EmailVerificationRequestedListener,
    PasswordResetRequestedListener,
    UserEmailChangeRequestedListener,
    FrontendUrlResolver,
  ],
  exports: [MailService],
})
export class MailModule {}
