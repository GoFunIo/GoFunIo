import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  FRONTEND_ORIGINS,
  type FrontendOrigins,
} from '../common/frontend-origins';
import type { TokenDelivery } from '../users/events/token-delivery';
import { sendResendEmail } from './resend.client';
import { renderMailTemplate } from './template-renderer';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly apiKey: string;
  private readonly from: string;

  constructor(
    config: ConfigService,
    @Inject(FRONTEND_ORIGINS) private readonly frontendOrigins: FrontendOrigins,
  ) {
    this.apiKey = config.getOrThrow<string>('RESEND_API_KEY');
    this.from = config.getOrThrow<string>('MAIL_FROM');
  }

  async sendVerificationEmail(delivery: TokenDelivery): Promise<void> {
    return this.send(
      'verify-email',
      {
        verificationUrl: `${this.frontendOrigins.resolveLinkBase(delivery.origin)}/verify-email?token=${delivery.token}`,
      },
      delivery.email,
      'Verify your GoFunIo email',
    );
  }

  async sendPasswordResetEmail(
    delivery: TokenDelivery,
    ttlHours: number,
    isFirstPassword = false,
  ): Promise<void> {
    return this.send(
      isFirstPassword ? 'set-password' : 'reset-password',
      {
        resetUrl: `${this.frontendOrigins.resolveLinkBase(delivery.origin)}/reset-password?token=${delivery.token}`,
        ttlHours,
      },
      delivery.email,
      isFirstPassword
        ? 'Set your GoFunIo password'
        : 'Reset your GoFunIo password',
    );
  }

  async sendEmailChangeVerification(delivery: TokenDelivery): Promise<void> {
    return this.send(
      'verify-email-change',
      {
        verificationUrl: `${this.frontendOrigins.resolveLinkBase(delivery.origin)}/verify-email-change?token=${delivery.token}`,
      },
      delivery.email,
      'Verify your new GoFunIo email',
    );
  }

  async sendMembershipInvitation(delivery: TokenDelivery): Promise<void> {
    return this.send(
      'membership-invitation',
      {
        acceptUrl: `${this.frontendOrigins.resolveLinkBase(delivery.origin)}/accept-invitation?token=${delivery.token}`,
      },
      delivery.email,
      'You were invited to a GoFunIo workspace',
    );
  }

  // Delivery is best-effort: workflows persist before emitting mail events.
  private async send(
    template: string,
    context: Record<string, unknown>,
    to: string,
    subject: string,
  ): Promise<void> {
    const html = renderMailTemplate(template, context);
    try {
      await sendResendEmail(this.apiKey, {
        from: this.from,
        to,
        subject,
        html,
      });
    } catch (err) {
      this.logger.error({
        event: 'mail.delivery_failed',
        template,
        to,
        error: err instanceof Error ? err.message : String(err),
        stack: err instanceof Error ? err.stack : undefined,
      });
    }
  }
}
