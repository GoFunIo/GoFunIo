import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MailerService } from '@nestjs-modules/mailer';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  constructor(
    private readonly mailer: MailerService,
    private readonly config: ConfigService,
  ) {}

  async sendVerificationEmail(email: string, token: string): Promise<void> {
    const frontendUrl = this.config.getOrThrow<string>('FRONTEND_URL');
    const verificationUrl = `${frontendUrl.replace(/\/$/, '')}/verify-email?token=${token}`;

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
