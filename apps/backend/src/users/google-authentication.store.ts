import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryFailedError, Repository } from 'typeorm';
import { GoogleAccountConflictError } from './google-authentication.errors';
import type { UserAccount } from './user-account';
import { User } from './users.entity';

export interface GoogleAccountRecord {
  account: UserAccount;
  googleId: string | null;
  emailVerified: boolean;
}

export interface GoogleLinkExpectation {
  email: string;
  emailVerified?: true;
  passwordHash?: string;
}

export const GOOGLE_AUTHENTICATION_STORE = Symbol(
  'GOOGLE_AUTHENTICATION_STORE',
);

export interface GoogleAuthenticationStore {
  findByGoogleId(googleId: string): Promise<GoogleAccountRecord | null>;
  findByEmail(email: string): Promise<GoogleAccountRecord | null>;
  recordLogin(userId: string, googleId: string, at: Date): Promise<boolean>;
  link(
    userId: string,
    googleId: string,
    at: Date,
    expected: GoogleLinkExpectation,
  ): Promise<boolean>;
}

@Injectable()
export class TypeOrmGoogleAuthenticationStore implements GoogleAuthenticationStore {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
  ) {}

  findByGoogleId(googleId: string): Promise<GoogleAccountRecord | null> {
    return this.find('user.googleId = :googleId', { googleId });
  }

  findByEmail(email: string): Promise<GoogleAccountRecord | null> {
    return this.find('user.email = :email', { email });
  }

  async recordLogin(
    userId: string,
    googleId: string,
    at: Date,
  ): Promise<boolean> {
    const result = await this.users
      .createQueryBuilder()
      .update(User)
      .set({ lastLoginAt: at })
      .where('id = :userId', { userId })
      .andWhere('googleId = :googleId', { googleId })
      .andWhere('"deletedAt" IS NULL')
      .execute();
    return (result.affected ?? 0) > 0;
  }

  async link(
    userId: string,
    googleId: string,
    at: Date,
    expected: GoogleLinkExpectation,
  ): Promise<boolean> {
    try {
      let query = this.users
        .createQueryBuilder()
        .update(User)
        .set({ googleId, lastLoginAt: at })
        .where('id = :userId', { userId })
        .andWhere('googleId IS NULL')
        .andWhere('email = :expectedEmail', { expectedEmail: expected.email })
        .andWhere('"deletedAt" IS NULL');
      if (expected.emailVerified) {
        query = query.andWhere('"emailVerifiedAt" IS NOT NULL');
      }
      if (expected.passwordHash !== undefined) {
        query = query.andWhere('password = :expectedPasswordHash', {
          expectedPasswordHash: expected.passwordHash,
        });
      }
      const result = await query.execute();
      return (result.affected ?? 0) > 0;
    } catch (error) {
      if (
        error instanceof QueryFailedError &&
        (
          error.driverError as
            | { code?: string; constraint?: string }
            | undefined
        )?.code === '23505' &&
        (error.driverError as { constraint?: string }).constraint ===
          'IDX_users_googleId'
      ) {
        throw new GoogleAccountConflictError();
      }
      throw error;
    }
  }

  private async find(
    where: string,
    parameters: Record<string, string>,
  ): Promise<GoogleAccountRecord | null> {
    const user = await this.users
      .createQueryBuilder('user')
      .where(where, parameters)
      .getOne();
    return user
      ? {
          account: {
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            phone: user.phone,
            address: user.address,
            postalCode: user.postalCode,
            city: user.city,
            pendingEmail: user.pendingEmail,
            hasPassword: user.hasPassword ?? false,
          },
          googleId: user.googleId,
          emailVerified: user.emailVerifiedAt !== null,
        }
      : null;
  }
}

export class InMemoryGoogleAuthenticationStore implements GoogleAuthenticationStore {
  readonly records: GoogleAccountRecord[] = [];
  readonly linkCalls: GoogleLinkExpectation[] = [];

  seed(record: GoogleAccountRecord): void {
    this.records.push(record);
  }

  findByGoogleId(googleId: string): Promise<GoogleAccountRecord | null> {
    return Promise.resolve(
      this.records.find((record) => record.googleId === googleId) ?? null,
    );
  }

  findByEmail(email: string): Promise<GoogleAccountRecord | null> {
    return Promise.resolve(
      this.records.find((record) => record.account.email === email) ?? null,
    );
  }

  recordLogin(userId: string, googleId: string, _at: Date): Promise<boolean> {
    return Promise.resolve(
      this.records.some(
        (record) =>
          record.account.id === userId && record.googleId === googleId,
      ),
    );
  }

  link(
    userId: string,
    googleId: string,
    _at: Date,
    expected: GoogleLinkExpectation,
  ): Promise<boolean> {
    this.linkCalls.push(expected);
    if (this.records.some((record) => record.googleId === googleId)) {
      throw new GoogleAccountConflictError();
    }
    const record = this.records.find(
      (candidate) => candidate.account.id === userId,
    );
    if (
      !record ||
      record.googleId !== null ||
      record.account.email !== expected.email ||
      (expected.emailVerified && !record.emailVerified)
    ) {
      return Promise.resolve(false);
    }
    record.googleId = googleId;
    return Promise.resolve(true);
  }
}
