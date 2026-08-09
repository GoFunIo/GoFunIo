import { Inject, Injectable } from '@nestjs/common';
import { CREDENTIAL_STORE, type CredentialStore } from './credential.store';
import { PASSWORD_HASHER, type PasswordHasher } from './password-hasher';
import type { UserAccount } from './user-account';
import {
  CredentialChangedError,
  CredentialCurrentPasswordError,
  CredentialEmailNotVerifiedError,
  CredentialPasswordRequiredError,
  CredentialPasswordUnchangedError,
  InvalidCredentialsError,
} from './credential-authentication.errors';

export interface AuthenticatedAccount {
  account: UserAccount;
  passwordVersion: number;
}

@Injectable()
export class CredentialAuthenticationService {
  constructor(
    @Inject(CREDENTIAL_STORE) private readonly store: CredentialStore,
    @Inject(PASSWORD_HASHER) private readonly hasher: PasswordHasher,
  ) {}

  async findAccount(userId: string): Promise<UserAccount | null> {
    const credential = await this.store.findById(userId);
    return credential?.account ?? null;
  }

  async signin(email: string, password: string): Promise<AuthenticatedAccount> {
    const credential = await this.store.findByEmail(email.trim().toLowerCase());
    const matches = await this.hasher.verify(
      password,
      credential?.passwordHash ?? null,
    );
    if (!credential || !credential.passwordHash || !matches) {
      throw new InvalidCredentialsError();
    }
    if (!credential.emailVerified) {
      throw new CredentialEmailNotVerifiedError();
    }
    const passwordVersion = await this.store.recordLogin(
      credential.account.id,
      credential.passwordHash,
      new Date(),
    );
    if (passwordVersion === null) throw new InvalidCredentialsError();
    return { account: credential.account, passwordVersion };
  }

  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
  ): Promise<number> {
    const credential = await this.store.findById(userId);
    if (!credential) throw new CredentialCurrentPasswordError();
    if (!credential.passwordHash) throw new CredentialPasswordRequiredError();
    if (!(await this.hasher.verify(currentPassword, credential.passwordHash))) {
      throw new CredentialCurrentPasswordError();
    }
    if (await this.hasher.verify(newPassword, credential.passwordHash)) {
      throw new CredentialPasswordUnchangedError();
    }
    const passwordVersion = await this.store.updatePassword(
      userId,
      credential.passwordHash,
      await this.hasher.hash(newPassword),
    );
    if (passwordVersion === null) {
      throw new CredentialChangedError();
    }
    return passwordVersion;
  }
}
