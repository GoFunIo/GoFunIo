import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './users.entity';
import {
  assertEmailClaimable,
  rethrowEmailClaimError,
} from './email-claim.util';
import { EmailChangeEmailInUseError } from './email-change.errors';

export const EMAIL_CHANGE_STORE = Symbol('EMAIL_CHANGE_STORE');

export interface EmailChangeStore {
  claim(
    userId: string,
    expectedPasswordVersion: number,
    email: string,
    tokenHash: string,
    expiresAt: Date,
  ): Promise<boolean>;
  consume(tokenHash: string, now: Date): Promise<boolean>;
}

@Injectable()
export class TypeOrmEmailChangeStore implements EmailChangeStore {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
  ) {}

  async claim(
    userId: string,
    expectedPasswordVersion: number,
    email: string,
    tokenHash: string,
    expiresAt: Date,
  ): Promise<boolean> {
    try {
      return await this.users.manager.transaction(async (manager) => {
        await assertEmailClaimable(
          manager,
          email,
          () => new EmailChangeEmailInUseError(),
          userId,
        );
        const result = await manager
          .createQueryBuilder()
          .update(User)
          .set({
            pendingEmail: email,
            emailChangeTokenHash: tokenHash,
            emailChangeTokenExpiresAt: expiresAt,
          })
          .where('id = :userId', { userId })
          .andWhere('"passwordVersion" = :expectedPasswordVersion', {
            expectedPasswordVersion,
          })
          .andWhere('"deletedAt" IS NULL')
          .andWhere(
            `EXISTS (
              SELECT 1 FROM "companies" "company"
              WHERE "company"."id" = "companyId"
              AND "company"."deletedAt" IS NULL
            )`,
          )
          .execute();
        return (result.affected ?? 0) > 0;
      });
    } catch (error) {
      rethrowEmailClaimError(error, () => new EmailChangeEmailInUseError());
    }
  }

  async consume(tokenHash: string, now: Date): Promise<boolean> {
    try {
      const result = await this.users
        .createQueryBuilder()
        .update(User)
        .set({
          email: () => '"pendingEmail"',
          pendingEmail: null,
          emailVerifiedAt: now,
          emailChangeTokenHash: null,
          emailChangeTokenExpiresAt: null,
          verificationTokenHash: null,
          verificationTokenExpiresAt: null,
          passwordResetTokenHash: null,
          passwordResetTokenExpiresAt: null,
        })
        .where('"emailChangeTokenHash" = :tokenHash', { tokenHash })
        .andWhere('"emailChangeTokenExpiresAt" > :now', { now })
        .andWhere('"pendingEmail" IS NOT NULL')
        .andWhere('"deletedAt" IS NULL')
        .andWhere(
          `EXISTS (
            SELECT 1 FROM "companies" "company"
            WHERE "company"."id" = "companyId"
            AND "company"."deletedAt" IS NULL
          )`,
        )
        .execute();
      return (result.affected ?? 0) > 0;
    } catch (error) {
      rethrowEmailClaimError(error, () => new EmailChangeEmailInUseError());
    }
  }
}

interface InMemoryEmailChangeUser {
  id: string;
  email: string;
  passwordVersion: number;
  emailVerifiedAt: Date | null;
  active?: boolean;
  passwordResetTokenHash?: string | null;
  passwordResetTokenExpiresAt?: Date | null;
  verificationTokenHash?: string | null;
  verificationTokenExpiresAt?: Date | null;
}

export class InMemoryEmailChangeStore implements EmailChangeStore {
  private readonly users = new Map<string, InMemoryEmailChangeUser>();
  private readonly claims = new Map<
    string,
    { userId: string; email: string; expiresAt: Date }
  >();

  seed(user: InMemoryEmailChangeUser): void {
    this.users.set(user.id, user);
  }

  get(userId: string): InMemoryEmailChangeUser | undefined {
    return this.users.get(userId);
  }

  claim(
    userId: string,
    expectedPasswordVersion: number,
    email: string,
    tokenHash: string,
    expiresAt: Date,
  ): Promise<boolean> {
    const user = this.users.get(userId);
    if (
      !user ||
      user.active === false ||
      user.passwordVersion !== expectedPasswordVersion
    ) {
      return Promise.resolve(false);
    }
    const now = Date.now();
    for (const [hash, claim] of this.claims) {
      if (claim.expiresAt.getTime() <= now || claim.userId === userId) {
        this.claims.delete(hash);
      }
    }
    const occupied = [...this.users.values()].some(
      (candidate) => candidate.id !== userId && candidate.email === email,
    );
    const claimed = [...this.claims.values()].some(
      (claim) => claim.userId !== userId && claim.email === email,
    );
    if (occupied || claimed) throw new EmailChangeEmailInUseError();
    this.claims.set(tokenHash, { userId, email, expiresAt });
    return Promise.resolve(true);
  }

  consume(tokenHash: string, now: Date): Promise<boolean> {
    const claim = this.claims.get(tokenHash);
    const user = claim ? this.users.get(claim.userId) : undefined;
    if (
      !claim ||
      !user ||
      user.active === false ||
      claim.expiresAt.getTime() <= now.getTime()
    ) {
      return Promise.resolve(false);
    }
    if (
      [...this.users.values()].some(
        (candidate) =>
          candidate.id !== user.id && candidate.email === claim.email,
      )
    ) {
      throw new EmailChangeEmailInUseError();
    }
    this.claims.delete(tokenHash);
    user.email = claim.email;
    user.emailVerifiedAt = now;
    user.passwordResetTokenHash = null;
    user.passwordResetTokenExpiresAt = null;
    user.verificationTokenHash = null;
    user.verificationTokenExpiresAt = null;
    return Promise.resolve(true);
  }
}
