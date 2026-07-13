import { Module } from '@nestjs/common';
import { MailService } from './mail.service';
import { UserRegisteredListener } from './listeners/user-registered.listener';
import { PasswordResetRequestedListener } from './listeners/password-reset-requested.listener';
import { FrontendUrlResolver } from '../common/frontend-url.resolver';
import { UserEmailChangeRequestedListener } from './listeners/user-email-change-requested.listener';

@Module({
  providers: [
    MailService,
    UserRegisteredListener,
    PasswordResetRequestedListener,
    UserEmailChangeRequestedListener,
    FrontendUrlResolver,
  ],
  exports: [MailService],
})
export class MailModule {}
