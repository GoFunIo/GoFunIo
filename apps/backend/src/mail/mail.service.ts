import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { FrontendUrlResolver } from '../common/frontend-url.resolver';
import { sendResendEmail } from './resend.client';
import { renderMailTemplate } from './template-renderer';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly apiKey: string;
  private readonly from: string;

  constructor(
    config: ConfigService,
    private readonly frontendUrl: FrontendUrlResolver,
  ) {
    this.apiKey = config.getOrThrow<string>('RESEND_API_KEY');
    this.from = config.getOrThrow<string>('MAIL_FROM');
  }

  async sendVerificationEmail(
    email: string,
    token: string,
    origin?: string,
  ): Promise<void> {
    const base = this.frontendUrl.resolve(origin).replace(/\/$/, '');
    const verificationUrl = `${base}/verify-email?token=${token}`;
    const html = renderMailTemplate('verify-email', { verificationUrl });

    try {
      await sendResendEmail(this.apiKey, {
        from: this.from,
        to: email,
        subject: 'Verify your GoFunIo email',
        html,
      });
    } catch (err) {
      this.logger.error(
        `Failed to send verification email to ${email}`,
        err instanceof Error ? err.stack : String(err),
      );
    }
  }

  async sendPasswordResetEmail(
    email: string,
    token: string,
    ttlHours: number,
    origin?: string,
    isFirstPassword = false,
  ): Promise<void> {
    const base = this.frontendUrl.resolve(origin).replace(/\/$/, '');
    const resetUrl = `${base}/reset-password?token=${token}`;
    const template = isFirstPassword ? 'set-password' : 'reset-password';
    const subject = isFirstPassword
      ? 'Set your GoFunIo password'
      : 'Reset your GoFunIo password';
    const html = renderMailTemplate(template, { resetUrl, ttlHours });

    try {
      await sendResendEmail(this.apiKey, {
        from: this.from,
        to: email,
        subject,
        html,
      });
    } catch (err) {
      this.logger.error({
        event: 'password-reset.requested',
        email,
        message: 'password_reset.mail_failed',
        error: err instanceof Error ? err.message : String(err),
        stack: err instanceof Error ? err.stack : undefined,
      });
    }
  }

  async sendEmailChangeVerification(
    email: string,
    token: string,
    origin?: string,
  ): Promise<void> {
    const base = this.frontendUrl.resolve(origin).replace(/\/$/, '');
    const verificationUrl = `${base}/verify-email-change?token=${token}`;
    const html = renderMailTemplate('verify-email-change', { verificationUrl });

    try {
      await sendResendEmail(this.apiKey, {
        from: this.from,
        to: email,
        subject: 'Verify your new GoFunIo email',
        html,
      });
    } catch (err) {
      this.logger.error(
        `Failed to send email change verification to ${email}`,
        err instanceof Error ? err.stack : String(err),
      );
    }
  }
}
