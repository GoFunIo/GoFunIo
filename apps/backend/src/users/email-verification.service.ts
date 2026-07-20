import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  EMAIL_VERIFICATION_STORE,
  type EmailVerificationStore,
} from './email-verification.store';
import { InvalidOrExpiredVerificationTokenError } from './email-verification.errors';
import {
  EMAIL_VERIFICATION_REQUESTED_EVENT,
  EmailVerificationRequestedEvent,
} from './events/email-verification-requested.event';
import { generateToken, hashToken } from './token.util';

@Injectable()
export class EmailVerificationService {
  constructor(
    @Inject(EMAIL_VERIFICATION_STORE)
    private readonly store: EmailVerificationStore,
    private readonly config: ConfigService,
    private readonly events: EventEmitter2,
  ) {}

  async verify(token: string): Promise<string> {
    const userId = await this.store.consume(hashToken(token), new Date());
    if (!userId) {
      throw new InvalidOrExpiredVerificationTokenError();
    }
    return userId;
  }

  async resend(email: string, origin?: string): Promise<void> {
    const { token, tokenHash, expiresAt } = generateToken(
      this.config.getOrThrow<number>('VERIFICATION_TOKEN_TTL_HOURS'),
    );
    const pending = await this.store.assign(
      email.trim().toLowerCase(),
      tokenHash,
      expiresAt,
    );
    if (!pending) {
      return;
    }
    this.events.emit(
      EMAIL_VERIFICATION_REQUESTED_EVENT,
      new EmailVerificationRequestedEvent(pending.userId, {
        email: pending.email,
        token,
        origin,
      }),
    );
  }
}
