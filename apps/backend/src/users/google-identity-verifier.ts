import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OAuth2Client } from 'google-auth-library';
import { InvalidGoogleIdentityError } from './google-authentication.errors';
import type { EnvVars } from '../config/env.validation';

export interface VerifiedGoogleIdentity {
  googleId: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  hostedDomain: string | null;
}

export const GOOGLE_IDENTITY_VERIFIER = Symbol('GOOGLE_IDENTITY_VERIFIER');

export interface GoogleIdentityVerifier {
  verify(credential: string): Promise<VerifiedGoogleIdentity>;
}

@Injectable()
export class GoogleSdkIdentityVerifier implements GoogleIdentityVerifier {
  private readonly client: OAuth2Client;
  private readonly clientId: string;

  constructor(@Inject(ConfigService) config: ConfigService<EnvVars, true>) {
    this.clientId = config.getOrThrow<string>('GOOGLE_CLIENT_ID');
    this.client = new OAuth2Client(this.clientId);
  }

  async verify(credential: string): Promise<VerifiedGoogleIdentity> {
    try {
      const ticket = await this.client.verifyIdToken({
        idToken: credential,
        audience: this.clientId,
      });
      const payload = ticket.getPayload();
      if (!payload?.sub || !payload.email || payload.email_verified !== true) {
        throw new InvalidGoogleIdentityError();
      }
      return {
        googleId: payload.sub,
        email: payload.email.trim().toLowerCase(),
        firstName: payload.given_name ?? null,
        lastName: payload.family_name ?? null,
        hostedDomain: payload.hd ?? null,
      };
    } catch (error) {
      if (error instanceof InvalidGoogleIdentityError) throw error;
      throw new InvalidGoogleIdentityError();
    }
  }
}

export class FakeGoogleIdentityVerifier implements GoogleIdentityVerifier {
  identity: VerifiedGoogleIdentity = {
    googleId: 'google-1',
    email: 'user@example.com',
    firstName: null,
    lastName: null,
    hostedDomain: null,
  };
  error?: Error;

  verify(_credential: string): Promise<VerifiedGoogleIdentity> {
    return this.error
      ? Promise.reject(this.error)
      : Promise.resolve(this.identity);
  }
}
