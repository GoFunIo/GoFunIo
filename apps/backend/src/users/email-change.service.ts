import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  EMAIL_CHANGE_STORE,
  type EmailChangeStore,
} from './email-change.store';
import {
  EmailUnchangedError,
  InvalidCurrentPasswordError,
  InvalidOrExpiredEmailChangeTokenError,
  PasswordRequiredForEmailChangeError,
} from './email-change.errors';
import { generateToken, hashToken } from './token.util';
import { verifyPassword } from './password.util';
import {
  USER_EMAIL_CHANGE_REQUESTED_EVENT,
  UserEmailChangeRequestedEvent,
} from './events/user-email-change-requested.event';

@Injectable()
export class EmailChangeService {
  constructor(
    @Inject(EMAIL_CHANGE_STORE) private readonly store: EmailChangeStore,
    private readonly config: ConfigService,
    private readonly events: EventEmitter2,
  ) {}

  async request(
    userId: string,
    email: string,
    currentPassword: string,
    origin?: string,
  ): Promise<void> {
    const target = await this.store.findTarget(userId);
    if (!target) throw new InvalidCurrentPasswordError();
    if (!target.passwordHash) throw new PasswordRequiredForEmailChangeError();
    if (!(await verifyPassword(currentPassword, target.passwordHash))) {
      throw new InvalidCurrentPasswordError();
    }
    email = email.trim().toLowerCase();
    if (email === target.email) throw new EmailUnchangedError();

    const { token, tokenHash, expiresAt } = generateToken(
      this.config.getOrThrow<number>('VERIFICATION_TOKEN_TTL_HOURS'),
    );
    if (
      !(await this.store.claim(
        userId,
        target.passwordHash,
        email,
        tokenHash,
        expiresAt,
      ))
    ) {
      throw new InvalidCurrentPasswordError();
    }
    this.events.emit(
      USER_EMAIL_CHANGE_REQUESTED_EVENT,
      new UserEmailChangeRequestedEvent({ email, token, origin }),
    );
  }

  async confirm(token: string): Promise<void> {
    if (!(await this.store.consume(hashToken(token), new Date()))) {
      throw new InvalidOrExpiredEmailChangeTokenError();
    }
  }
}
