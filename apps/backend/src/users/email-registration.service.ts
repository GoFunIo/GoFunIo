import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  EMAIL_VERIFICATION_REQUESTED_EVENT,
  EmailVerificationRequestedEvent,
} from './events/email-verification-requested.event';
import { PASSWORD_HASHER, type PasswordHasher } from './password-hasher';
import { generateToken } from './token.util';
import type { UserAccount } from './user-account';
import {
  WORKSPACE_OWNER_PROVISIONER,
  WorkspaceOwnerConflictError,
  type WorkspaceOwnerProvisioner,
} from './workspace-owner-provisioner';
import { EmailRegistrationEmailInUseError } from './email-registration.errors';

@Injectable()
export class EmailRegistrationService {
  constructor(
    @Inject(WORKSPACE_OWNER_PROVISIONER)
    private readonly provisioner: WorkspaceOwnerProvisioner,
    @Inject(PASSWORD_HASHER) private readonly hasher: PasswordHasher,
    private readonly config: ConfigService,
    private readonly events: EventEmitter2,
  ) {}

  async register(
    email: string,
    password: string,
    origin?: string,
  ): Promise<UserAccount> {
    email = email.trim().toLowerCase();
    const passwordHash = await this.hasher.hash(password);
    const { token, tokenHash, expiresAt } = generateToken(
      this.config.getOrThrow<number>('VERIFICATION_TOKEN_TTL_HOURS'),
    );
    let account: UserAccount;
    try {
      account = await this.provisioner.provision({
        email,
        passwordHash,
        verificationTokenHash: tokenHash,
        verificationTokenExpiresAt: expiresAt,
      });
    } catch (error) {
      if (error instanceof WorkspaceOwnerConflictError) {
        throw new EmailRegistrationEmailInUseError();
      }
      throw error;
    }
    this.events.emit(
      EMAIL_VERIFICATION_REQUESTED_EVENT,
      new EmailVerificationRequestedEvent(account.id, {
        email: account.email,
        token,
        origin,
      }),
    );
    return account;
  }
}
