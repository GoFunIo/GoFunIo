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
import {
  USER_EMAIL_CHANGE_REQUESTED_EVENT,
  UserEmailChangeRequestedEvent,
} from './events/user-email-change-requested.event';
import { CREDENTIAL_STORE, type CredentialStore } from './credential.store';
import { PASSWORD_HASHER, type PasswordHasher } from './password-hasher';

@Injectable()
export class EmailChangeService {
  constructor(
    @Inject(EMAIL_CHANGE_STORE) private readonly store: EmailChangeStore,
    private readonly config: ConfigService,
    private readonly events: EventEmitter2,
    @Inject(CREDENTIAL_STORE) private readonly credentials: CredentialStore,
    @Inject(PASSWORD_HASHER) private readonly hasher: PasswordHasher,
  ) {}

  async request(
    userId: string,
    email: string,
    currentPassword: string,
    origin?: string,
  ): Promise<void> {
    const credential = await this.credentials.findById(userId);
    if (!credential) throw new InvalidCurrentPasswordError();
    if (!credential.passwordHash) {
      throw new PasswordRequiredForEmailChangeError();
    }
    if (!(await this.hasher.verify(currentPassword, credential.passwordHash))) {
      throw new InvalidCurrentPasswordError();
    }
    email = email.trim().toLowerCase();
    if (email === credential.account.email) throw new EmailUnchangedError();

    const { token, tokenHash, expiresAt } = generateToken(
      this.config.getOrThrow<number>('VERIFICATION_TOKEN_TTL_HOURS'),
    );
    if (
      !(await this.store.claim(
        userId,
        credential.passwordVersion,
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
