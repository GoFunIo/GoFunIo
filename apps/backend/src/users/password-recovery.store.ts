import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './users.entity';

export const PASSWORD_RECOVERY_STORE = Symbol('PASSWORD_RECOVERY_STORE');

export interface PasswordRecoveryTarget {
  userId: string;
  email: string;
  isFirstPassword: boolean;
}

export interface PasswordRecoveryStore {
  assignByEmail(
    email: string,
    tokenHash: string,
    expiresAt: Date,
  ): Promise<PasswordRecoveryTarget | null>;
  assignFirstPassword(
    userId: string,
    tokenHash: string,
    expiresAt: Date,
  ): Promise<PasswordRecoveryTarget | null>;
  consume(tokenHash: string, passwordHash: string, now: Date): Promise<boolean>;
}

@Injectable()
export class TypeOrmPasswordRecoveryStore implements PasswordRecoveryStore {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
  ) {}

  async assignByEmail(
    email: string,
    tokenHash: string,
    expiresAt: Date,
  ): Promise<PasswordRecoveryTarget | null> {
    const result = await this.assign(
      'email = :email',
      { email },
      tokenHash,
      expiresAt,
    );
    return this.target(result);
  }

  async assignFirstPassword(
    userId: string,
    tokenHash: string,
    expiresAt: Date,
  ): Promise<PasswordRecoveryTarget | null> {
    const result = await this.assign(
      'id = :userId',
      { userId },
      tokenHash,
      expiresAt,
      true,
    );
    return this.target(result);
  }

  async consume(
    tokenHash: string,
    passwordHash: string,
    now: Date,
  ): Promise<boolean> {
    const result = await this.users
      .createQueryBuilder()
      .update(User)
      .set({
        password: passwordHash,
        emailVerifiedAt: () =>
          'CASE WHEN "password" IS NULL THEN COALESCE("emailVerifiedAt", now()) ELSE "emailVerifiedAt" END',
        passwordResetTokenHash: null,
        passwordResetTokenExpiresAt: null,
        passwordVersion: () => '"passwordVersion" + 1',
      })
      .where('"passwordResetTokenHash" = :tokenHash', { tokenHash })
      .andWhere('"passwordResetTokenExpiresAt" > :now', { now })
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
  }

  private assign(
    where: string,
    parameters: Record<string, string>,
    tokenHash: string,
    expiresAt: Date,
    firstPasswordOnly = false,
  ) {
    let query = this.users
      .createQueryBuilder()
      .update(User)
      .set({
        passwordResetTokenHash: tokenHash,
        passwordResetTokenExpiresAt: expiresAt,
      })
      .where(where, parameters)
      .andWhere('"deletedAt" IS NULL')
      .andWhere(
        `EXISTS (
          SELECT 1 FROM "companies" "company"
          WHERE "company"."id" = "companyId"
          AND "company"."deletedAt" IS NULL
        )`,
      );
    if (firstPasswordOnly) {
      query = query.andWhere('"password" IS NULL');
    }
    return query.returning(['id', 'email', 'password']).execute();
  }

  private target(result: { raw: unknown }): PasswordRecoveryTarget | null {
    const row = (
      result.raw as Array<{
        id: string;
        email: string;
        password: string | null;
      }>
    )[0];
    return row
      ? {
          userId: row.id,
          email: row.email,
          isFirstPassword: row.password === null,
        }
      : null;
  }
}

interface InMemoryPasswordRecoveryUser {
  id: string;
  email: string;
  passwordHash: string | null;
  emailVerifiedAt: Date | null;
  passwordVersion: number;
  active?: boolean;
}

export class InMemoryPasswordRecoveryStore implements PasswordRecoveryStore {
  private readonly users = new Map<string, InMemoryPasswordRecoveryUser>();
  private readonly tokens = new Map<
    string,
    { userId: string; expiresAt: Date }
  >();

  seed(user: InMemoryPasswordRecoveryUser): void {
    this.users.set(user.id, user);
  }

  get(userId: string): InMemoryPasswordRecoveryUser | undefined {
    return this.users.get(userId);
  }

  assignByEmail(
    email: string,
    tokenHash: string,
    expiresAt: Date,
  ): Promise<PasswordRecoveryTarget | null> {
    const user = [...this.users.values()].find(
      (candidate) => candidate.email === email && candidate.active !== false,
    );
    return Promise.resolve(this.assignUser(user, tokenHash, expiresAt));
  }

  assignFirstPassword(
    userId: string,
    tokenHash: string,
    expiresAt: Date,
  ): Promise<PasswordRecoveryTarget | null> {
    const user = this.users.get(userId);
    return Promise.resolve(
      this.assignUser(
        user?.active !== false && user?.passwordHash === null
          ? user
          : undefined,
        tokenHash,
        expiresAt,
      ),
    );
  }

  consume(
    tokenHash: string,
    passwordHash: string,
    now: Date,
  ): Promise<boolean> {
    const token = this.tokens.get(tokenHash);
    const user = token ? this.users.get(token.userId) : undefined;
    if (
      !token ||
      !user ||
      user.active === false ||
      token.expiresAt.getTime() <= now.getTime()
    ) {
      return Promise.resolve(false);
    }
    this.tokens.delete(tokenHash);
    if (user.passwordHash === null) {
      user.emailVerifiedAt ??= now;
    }
    user.passwordHash = passwordHash;
    user.passwordVersion += 1;
    return Promise.resolve(true);
  }

  private assignUser(
    user: InMemoryPasswordRecoveryUser | undefined,
    tokenHash: string,
    expiresAt: Date,
  ): PasswordRecoveryTarget | null {
    if (!user) return null;
    for (const [hash, token] of this.tokens) {
      if (token.userId === user.id) this.tokens.delete(hash);
    }
    this.tokens.set(tokenHash, { userId: user.id, expiresAt });
    return {
      userId: user.id,
      email: user.email,
      isFirstPassword: user.passwordHash === null,
    };
  }
}
