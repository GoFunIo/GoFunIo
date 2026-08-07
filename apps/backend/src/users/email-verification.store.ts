import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './users.entity';

export const EMAIL_VERIFICATION_STORE = Symbol('EMAIL_VERIFICATION_STORE');

export interface PendingVerification {
  userId: string;
  email: string;
}

export interface EmailVerificationStore {
  assign(
    email: string,
    tokenHash: string,
    expiresAt: Date,
  ): Promise<PendingVerification | null>;
  consume(tokenHash: string, now: Date): Promise<string | null>;
}

@Injectable()
export class TypeOrmEmailVerificationStore implements EmailVerificationStore {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
  ) {}

  async assign(
    email: string,
    tokenHash: string,
    expiresAt: Date,
  ): Promise<PendingVerification | null> {
    const result = await this.users
      .createQueryBuilder()
      .update(User)
      .set({
        verificationTokenHash: tokenHash,
        verificationTokenExpiresAt: expiresAt,
      })
      .where('email = :email', { email })
      .andWhere('"emailVerifiedAt" IS NULL')
      .andWhere('"deletedAt" IS NULL')
      .andWhere(
        `EXISTS (
          SELECT 1 FROM "companies" "company"
          WHERE "company"."id" = "companyId"
          AND "company"."deletedAt" IS NULL
        )`,
      )
      .returning(['id', 'email'])
      .execute();

    const row = (result.raw as Array<{ id: string; email: string }>)[0];
    return row ? { userId: row.id, email: row.email } : null;
  }

  async consume(tokenHash: string, now: Date): Promise<string | null> {
    const result = await this.users
      .createQueryBuilder()
      .update(User)
      .set({
        emailVerifiedAt: now,
        verificationTokenHash: null,
        verificationTokenExpiresAt: null,
      })
      .where('"verificationTokenHash" = :tokenHash', { tokenHash })
      .andWhere('"emailVerifiedAt" IS NULL')
      .andWhere('"verificationTokenExpiresAt" > :now', { now })
      .andWhere('"deletedAt" IS NULL')
      .andWhere(
        `EXISTS (
          SELECT 1 FROM "companies" "company"
          WHERE "company"."id" = "companyId"
          AND "company"."deletedAt" IS NULL
        )`,
      )
      .returning('id')
      .execute();

    return (result.raw as Array<{ id: string }>)[0]?.id ?? null;
  }
}

export class InMemoryEmailVerificationStore implements EmailVerificationStore {
  private readonly users = new Map<
    string,
    { id: string; email: string; verified: boolean }
  >();
  private readonly tokens = new Map<
    string,
    { userId: string; expiresAt: Date }
  >();

  seed(user: { id: string; email: string; verified: boolean }): void {
    this.users.set(user.email, user);
  }

  assign(
    email: string,
    tokenHash: string,
    expiresAt: Date,
  ): Promise<PendingVerification | null> {
    const user = this.users.get(email);
    if (!user || user.verified) {
      return Promise.resolve(null);
    }
    for (const [hash, token] of this.tokens) {
      if (token.userId === user.id) {
        this.tokens.delete(hash);
      }
    }
    this.tokens.set(tokenHash, { userId: user.id, expiresAt });
    return Promise.resolve({ userId: user.id, email: user.email });
  }

  consume(tokenHash: string, now: Date): Promise<string | null> {
    const token = this.tokens.get(tokenHash);
    if (!token || token.expiresAt.getTime() <= now.getTime()) {
      return Promise.resolve(null);
    }
    const user = [...this.users.values()].find((u) => u.id === token.userId);
    if (!user || user.verified) {
      return Promise.resolve(null);
    }
    this.tokens.delete(tokenHash);
    user.verified = true;
    return Promise.resolve(token.userId);
  }
}
