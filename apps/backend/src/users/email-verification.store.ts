import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryFailedError, Repository } from 'typeorm';
import { User } from './users.entity';
import { Company } from '../companies/companies.entity';
import { MembershipRole } from './membership-role';
import { Membership } from './membership.entity';
import {
  clearExpiredEmailClaims,
  emailClaimInUse,
  lockEmailClaim,
} from './email-claim.util';
import { VerificationEmailInUseError } from './email-verification.errors';

export const EMAIL_VERIFICATION_STORE = Symbol('EMAIL_VERIFICATION_STORE');

export interface PendingVerification {
  userId: string;
  email: string;
}

export interface ProvisionedAccount {
  id: string;
  companyId: string;
  email: string;
  role: MembershipRole;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  address: string | null;
  postalCode: string | null;
  city: string | null;
  pendingEmail: string | null;
  hasPassword: true;
}

export interface EmailVerificationStore {
  createAccount(
    email: string,
    passwordHash: string,
    tokenHash: string,
    expiresAt: Date,
  ): Promise<ProvisionedAccount>;
  assign(
    email: string,
    tokenHash: string,
    expiresAt: Date,
  ): Promise<PendingVerification | null>;
  consume(tokenHash: string, now: Date): Promise<string | null>;
}

function isUniqueViolation(error: unknown): boolean {
  return (
    error instanceof QueryFailedError &&
    (error.driverError as { code?: string } | undefined)?.code === '23505'
  );
}

@Injectable()
export class TypeOrmEmailVerificationStore implements EmailVerificationStore {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
  ) {}

  async createAccount(
    email: string,
    passwordHash: string,
    tokenHash: string,
    expiresAt: Date,
  ): Promise<ProvisionedAccount> {
    try {
      return await this.users.manager.transaction(async (manager) => {
        await lockEmailClaim(manager, email);
        await clearExpiredEmailClaims(manager, email);
        if (await emailClaimInUse(manager, email)) {
          throw new VerificationEmailInUseError();
        }
        const company = await manager.save(
          manager.create(Company, { name: 'Moja firma' }),
        );
        const user = await manager.save(
          manager.create(User, {
            companyId: company.id,
            email,
            password: passwordHash,
            role: MembershipRole.ADMIN,
            verificationTokenHash: tokenHash,
            verificationTokenExpiresAt: expiresAt,
          }),
        );
        await manager.save(
          manager.create(Membership, {
            userId: user.id,
            companyId: user.companyId,
            role: user.role,
          }),
        );
        return {
          id: user.id,
          companyId: user.companyId,
          email: user.email,
          role: user.role,
          firstName: user.firstName,
          lastName: user.lastName,
          phone: user.phone,
          address: user.address,
          postalCode: user.postalCode,
          city: user.city,
          pendingEmail: user.pendingEmail,
          hasPassword: true,
        };
      });
    } catch (error) {
      if (isUniqueViolation(error)) throw new VerificationEmailInUseError();
      throw error;
    }
  }

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

  createAccount(
    email: string,
    _passwordHash: string,
    tokenHash: string,
    expiresAt: Date,
  ): Promise<ProvisionedAccount> {
    if (this.users.has(email)) throw new VerificationEmailInUseError();
    const user = { id: `user-${this.users.size + 1}`, email, verified: false };
    this.users.set(email, user);
    this.tokens.set(tokenHash, { userId: user.id, expiresAt });
    return Promise.resolve({
      id: user.id,
      companyId: `company-${this.users.size}`,
      email,
      role: MembershipRole.ADMIN,
      firstName: null,
      lastName: null,
      phone: null,
      address: null,
      postalCode: null,
      city: null,
      pendingEmail: null,
      hasPassword: true,
    });
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
