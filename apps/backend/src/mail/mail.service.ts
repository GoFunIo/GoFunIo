import { Injectable, Logger } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';
import { FrontendUrlResolver } from '../common/frontend-url.resolver';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  constructor(
    private readonly mailer: MailerService,
    private readonly frontendUrl: FrontendUrlResolver,
  ) {}

  async sendVerificationEmail(
    email: string,
    token: string,
    origin?: string,
  ): Promise<void> {
    const base = this.frontendUrl.resolve(origin).replace(/\/$/, '');
    const verificationUrl = `${base}/verify-email?token=${token}`;

    try {
      await this.mailer.sendMail({
        to: email,
        subject: 'Verify your GoFunIo email',
        template: 'verify-email',
        context: { verificationUrl },
      });
    } catch (err) {
      this.logger.error(
        `Failed to send verification email to ${email}`,
        err instanceof Error ? err.stack : String(err),
      );
    }
  }
}
