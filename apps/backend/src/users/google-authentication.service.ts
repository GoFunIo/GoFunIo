import { Inject, Injectable } from '@nestjs/common';
import { CREDENTIAL_STORE, type CredentialStore } from './credential.store';
import {
  GoogleAccountConflictError,
  GoogleEmailUnverifiedError,
  GoogleExplicitLinkRequiredError,
  GoogleLinkChangedError,
  InvalidGoogleLinkCredentialsError,
} from './google-authentication.errors';
import {
  GOOGLE_AUTHENTICATION_STORE,
  type GoogleAccountRecord,
  type GoogleAuthenticationStore,
  type GoogleLinkExpectation,
} from './google-authentication.store';
import {
  GOOGLE_IDENTITY_VERIFIER,
  type GoogleIdentityVerifier,
  type VerifiedGoogleIdentity,
} from './google-identity-verifier';
import { PASSWORD_HASHER, type PasswordHasher } from './password-hasher';
import type { UserAccount } from './user-account';
import {
  WORKSPACE_OWNER_PROVISIONER,
  WorkspaceOwnerConflictError,
  type WorkspaceOwnerProvisioner,
} from './workspace-owner-provisioner';

@Injectable()
export class GoogleAuthenticationService {
  constructor(
    @Inject(GOOGLE_IDENTITY_VERIFIER)
    private readonly verifier: GoogleIdentityVerifier,
    @Inject(GOOGLE_AUTHENTICATION_STORE)
    private readonly store: GoogleAuthenticationStore,
    @Inject(WORKSPACE_OWNER_PROVISIONER)
    private readonly provisioner: WorkspaceOwnerProvisioner,
    @Inject(CREDENTIAL_STORE) private readonly credentials: CredentialStore,
    @Inject(PASSWORD_HASHER) private readonly hasher: PasswordHasher,
  ) {}

  async signin(credential: string): Promise<UserAccount> {
    const identity = await this.verifier.verify(credential);
    const existingByGoogle = await this.store.findByGoogleId(identity.googleId);
    if (existingByGoogle) {
      await this.store.recordLogin(
        existingByGoogle.account.id,
        identity.googleId,
        new Date(),
      );
      return existingByGoogle.account;
    }

    const existingByEmail = await this.store.findByEmail(identity.email);
    if (existingByEmail) {
      return this.autoLink(existingByEmail, identity);
    }

    try {
      return await this.provisioner.provision({
        email: identity.email,
        googleId: identity.googleId,
        firstName: identity.firstName,
        lastName: identity.lastName,
        emailVerifiedAt: new Date(),
      });
    } catch (error) {
      if (!(error instanceof WorkspaceOwnerConflictError)) throw error;
      const concurrent = await this.store.findByGoogleId(identity.googleId);
      if (concurrent) return concurrent.account;
      throw new GoogleAccountConflictError();
    }
  }

  async link(
    userId: string,
    credential: string,
    password: string,
  ): Promise<UserAccount> {
    const identity = await this.verifier.verify(credential);
    const credentialRecord = await this.credentials.findById(userId);
    const passwordValid = await this.hasher.verify(
      password,
      credentialRecord?.passwordHash ?? null,
    );
    if (
      !credentialRecord ||
      credentialRecord.account.email !== identity.email ||
      !passwordValid ||
      credentialRecord.passwordHash === null
    ) {
      throw new InvalidGoogleLinkCredentialsError();
    }

    const existingByGoogle = await this.store.findByGoogleId(identity.googleId);
    if (existingByGoogle) {
      if (existingByGoogle.account.id === userId)
        return existingByGoogle.account;
      throw new GoogleAccountConflictError();
    }
    const existingByEmail = await this.store.findByEmail(identity.email);
    if (existingByEmail?.googleId) throw new GoogleAccountConflictError();

    return this.linkOrResolve(credentialRecord.account, identity.googleId, {
      email: identity.email,
      passwordHash: credentialRecord.passwordHash,
    });
  }

  private async autoLink(
    existing: GoogleAccountRecord,
    identity: VerifiedGoogleIdentity,
  ): Promise<UserAccount> {
    if (existing.googleId && existing.googleId !== identity.googleId) {
      throw new GoogleAccountConflictError();
    }
    if (!existing.emailVerified) throw new GoogleEmailUnverifiedError();
    if (
      !identity.email.endsWith('@gmail.com') &&
      identity.hostedDomain === null
    ) {
      throw new GoogleExplicitLinkRequiredError();
    }
    return this.linkOrResolve(existing.account, identity.googleId, {
      email: identity.email,
      emailVerified: true,
    });
  }

  private async linkOrResolve(
    account: UserAccount,
    googleId: string,
    expected: GoogleLinkExpectation,
  ): Promise<UserAccount> {
    try {
      if (await this.store.link(account.id, googleId, new Date(), expected)) {
        return account;
      }
    } catch (error) {
      if (!(error instanceof GoogleAccountConflictError)) throw error;
    }
    const concurrent = await this.store.findByGoogleId(googleId);
    if (concurrent?.account.id === account.id) return concurrent.account;
    throw new GoogleLinkChangedError();
  }
}
