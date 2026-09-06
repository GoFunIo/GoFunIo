import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  FRONTEND_ORIGINS,
  type FrontendOrigins,
} from '../common/frontend-origins';
import type { TokenDelivery } from '../users/events/token-delivery';
import { User } from '../users/users.entity';
import { MAIL_TRANSPORT, type MailTransport } from './mail-transport';
import { renderMailTemplate } from './template-renderer';
import type { EnvVars } from '../config/env.validation';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly from: string;

  constructor(
    config: ConfigService<EnvVars, true>,
    @Inject(FRONTEND_ORIGINS) private readonly frontendOrigins: FrontendOrigins,
    @Inject(MAIL_TRANSPORT) private readonly transport: MailTransport,
    @InjectRepository(User) private readonly users: Repository<User>,
  ) {
    this.from = config.getOrThrow<string>('MAIL_FROM');
  }

  async sendVerificationEmail(
    delivery: TokenDelivery,
    userId?: string,
  ): Promise<void> {
    const base = this.frontendOrigins.resolveLinkBase(delivery.origin);
    return this.send(
      'verify-email',
      {
        link: `${base}/verify-email?token=${delivery.token}`,
        assetBaseUrl: base,
        firstName: await this.firstName(userId),
      },
      delivery.email,
      'Potwierdź swój adres e-mail w AutoKeep',
    );
  }

  async sendPasswordResetEmail(
    delivery: TokenDelivery,
    ttlHours: number,
    isFirstPassword = false,
    userId?: string,
  ): Promise<void> {
    const base = this.frontendOrigins.resolveLinkBase(delivery.origin);
    return this.send(
      isFirstPassword ? 'set-password' : 'reset-password',
      {
        link: `${base}/reset-password?token=${delivery.token}`,
        assetBaseUrl: base,
        ttlHours,
        firstName: await this.firstName(userId),
      },
      delivery.email,
      isFirstPassword
        ? 'Ustaw hasło do AutoKeep'
        : 'Zresetuj hasło do AutoKeep',
    );
  }

  async sendEmailChangeVerification(
    delivery: TokenDelivery,
    userId?: string,
  ): Promise<void> {
    const base = this.frontendOrigins.resolveLinkBase(delivery.origin);
    return this.send(
      'verify-email-change',
      {
        link: `${base}/verify-email-change?token=${delivery.token}`,
        assetBaseUrl: base,
        newEmail: delivery.email,
        firstName: await this.firstName(userId),
      },
      delivery.email,
      'Potwierdź nowy adres e-mail w AutoKeep',
    );
  }

  async sendMembershipInvitation(delivery: TokenDelivery): Promise<void> {
    const base = this.frontendOrigins.resolveLinkBase(delivery.origin);
    return this.send(
      'membership-invitation',
      {
        link: `${base}/accept-invitation?token=${delivery.token}`,
        assetBaseUrl: base,
      },
      delivery.email,
      'Zaproszenie do zespołu w AutoKeep',
    );
  }

  // Best-effort: a failed name lookup must not block the email.
  private async firstName(userId?: string): Promise<string | undefined> {
    if (!userId) return undefined;
    try {
      const user = await this.users.findOne({
        where: { id: userId },
        select: { firstName: true },
      });
      return user?.firstName ?? undefined;
    } catch (err) {
      this.logger.warn({
        event: 'mail.recipient_lookup_failed',
        errorType: err instanceof Error ? err.constructor.name : 'UnknownError',
      });
      return undefined;
    }
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
      await this.transport.send({
        from: this.from,
        to,
        subject,
        html,
      });
    } catch (err) {
      this.logger.error({
        event: 'mail.delivery_failed',
        template,
        errorType: err instanceof Error ? err.constructor.name : 'UnknownError',
      });
    }
  }
}
