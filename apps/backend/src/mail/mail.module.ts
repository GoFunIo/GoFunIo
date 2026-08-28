import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EnvVars, MailTransportDriver } from '../config/env.validation';
import { MailService } from './mail.service';
import { MAIL_TRANSPORT, type MailTransport } from './mail-transport';
import { ResendMailTransport } from './resend-mail.transport';
import { SmtpMailTransport } from './smtp-mail.transport';
import { EmailVerificationRequestedListener } from './listeners/email-verification-requested.listener';
import { PasswordResetRequestedListener } from './listeners/password-reset-requested.listener';
import { UserEmailChangeRequestedListener } from './listeners/user-email-change-requested.listener';
import { MembershipInvitationRequestedListener } from './listeners/membership-invitation-requested.listener';

export function createMailTransport(
  config: ConfigService<EnvVars, true>,
): MailTransport {
  if (config.get('MAIL_TRANSPORT') === MailTransportDriver.Smtp) {
    return SmtpMailTransport.create({
      host: config.getOrThrow('MAIL_SMTP_HOST'),
      port: config.getOrThrow('MAIL_SMTP_PORT'),
    });
  }
  return new ResendMailTransport(config.getOrThrow('RESEND_API_KEY'));
}

@Module({
  providers: [
    {
      provide: MAIL_TRANSPORT,
      inject: [ConfigService],
      useFactory: createMailTransport,
    },
    MailService,
    EmailVerificationRequestedListener,
    PasswordResetRequestedListener,
    UserEmailChangeRequestedListener,
    MembershipInvitationRequestedListener,
  ],
  exports: [MAIL_TRANSPORT],
})
export class MailModule {}
