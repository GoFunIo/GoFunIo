import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  PASSWORD_RECOVERY_STORE,
  type PasswordRecoveryStore,
  type PasswordRecoveryTarget,
} from './password-recovery.store';
import { InvalidOrExpiredPasswordRecoveryTokenError } from './password-recovery.errors';
import {
  PASSWORD_RESET_REQUESTED_EVENT,
  PasswordResetRequestedEvent,
} from './events/password-reset-requested.event';
import { generateToken, hashToken } from './token.util';
import { hashPassword } from './password.util';
import type { EnvVars } from '../config/env.validation';

@Injectable()
export class PasswordRecoveryService {
  constructor(
    @Inject(PASSWORD_RECOVERY_STORE)
    private readonly store: PasswordRecoveryStore,
    private readonly config: ConfigService<EnvVars, true>,
    private readonly events: EventEmitter2,
  ) {}

  async request(email: string, origin?: string): Promise<void> {
    const { token, tokenHash, expiresAt, ttlHours } = this.token();
    const target = await this.store.assignByEmail(
      email.trim().toLowerCase(),
      tokenHash,
      expiresAt,
    );
    if (target) this.emit(target, token, ttlHours, origin);
  }

  async issueFirstPassword(
    userId: string,
    origin?: string,
    membershipId?: string,
    ttlHours?: number,
  ): Promise<void> {
    const generated = this.token(ttlHours);
    const { token, tokenHash, expiresAt } = generated;
    const target = await this.store.assignFirstPassword(
      userId,
      tokenHash,
      expiresAt,
      membershipId,
    );
    if (!target) {
      throw new Error('Cannot issue first password for this user');
    }
    this.emit(target, token, generated.ttlHours, origin);
  }

  async reset(token: string, newPassword: string): Promise<void> {
    const consumed = await this.store.consume(
      hashToken(token),
      await hashPassword(newPassword),
      new Date(),
    );
    if (!consumed) {
      throw new InvalidOrExpiredPasswordRecoveryTokenError();
    }
  }

  private token(ttlHours?: number) {
    ttlHours ??= this.config.getOrThrow<number>(
      'PASSWORD_RESET_TOKEN_TTL_HOURS',
    );
    return { ...generateToken(ttlHours), ttlHours };
  }

  private emit(
    target: PasswordRecoveryTarget,
    token: string,
    ttlHours: number,
    origin?: string,
  ): void {
    this.events.emit(
      PASSWORD_RESET_REQUESTED_EVENT,
      new PasswordResetRequestedEvent(
        target.userId,
        { email: target.email, token, origin },
        ttlHours,
        target.isFirstPassword,
      ),
    );
  }
}
