import { Module } from '@nestjs/common';
import { MailService } from './mail.service';
import { UserRegisteredListener } from './listeners/user-registered.listener';
import { PasswordResetRequestedListener } from './listeners/password-reset-requested.listener';
import { FrontendUrlResolver } from '../common/frontend-url.resolver';

@Module({
  providers: [
    MailService,
    UserRegisteredListener,
    PasswordResetRequestedListener,
    FrontendUrlResolver,
  ],
  exports: [MailService],
})
export class MailModule {}
