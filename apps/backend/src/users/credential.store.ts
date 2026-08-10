import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './users.entity';
import type { UserAccount } from './user-account';

export const CREDENTIAL_STORE = Symbol('CREDENTIAL_STORE');

export interface CredentialRecord {
  account: UserAccount;
  passwordHash: string | null;
  passwordVersion: number;
  emailVerified: boolean;
}

export interface CredentialStore {
  findByEmail(email: string): Promise<CredentialRecord | null>;
  findById(userId: string): Promise<CredentialRecord | null>;
  recordLogin(
    userId: string,
    expectedPasswordHash: string,
    at: Date,
  ): Promise<number | null>;
  updatePassword(
    userId: string,
    expectedPasswordHash: string,
    passwordHash: string,
  ): Promise<number | null>;
}

@Injectable()
export class TypeOrmCredentialStore implements CredentialStore {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
  ) {}

  findByEmail(email: string): Promise<CredentialRecord | null> {
    return this.find('user.email = :email', { email });
  }

  findById(userId: string): Promise<CredentialRecord | null> {
    return this.find('user.id = :userId', { userId });
  }

  async recordLogin(
    userId: string,
    expectedPasswordHash: string,
    at: Date,
  ): Promise<number | null> {
    const result = await this.users
      .createQueryBuilder()
      .update(User)
      .set({ lastLoginAt: at })
      .where('id = :userId', { userId })
      .andWhere('password = :expectedPasswordHash', { expectedPasswordHash })
      .andWhere('"deletedAt" IS NULL')
      .returning('"passwordVersion"')
      .execute();
    return (
      (result.raw as Array<{ passwordVersion: number }>)[0]?.passwordVersion ??
      null
    );
  }

  async updatePassword(
    userId: string,
    expectedPasswordHash: string,
    passwordHash: string,
  ): Promise<number | null> {
    const result = await this.users
      .createQueryBuilder()
      .update(User)
      .set({
        password: passwordHash,
        passwordVersion: () => '"passwordVersion" + 1',
        passwordResetTokenHash: null,
        passwordResetTokenExpiresAt: null,
      })
      .where('id = :userId', { userId })
      .andWhere('password = :expectedPasswordHash', { expectedPasswordHash })
      .andWhere('"deletedAt" IS NULL')
      .returning('"passwordVersion"')
      .execute();
    return (
      (result.raw as Array<{ passwordVersion: number }>)[0]?.passwordVersion ??
      null
    );
  }

  private async find(
    where: string,
    parameters: Record<string, string>,
  ): Promise<CredentialRecord | null> {
    const user = await this.users
      .createQueryBuilder('user')
      .addSelect('user.password')
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
            hasPassword: user.password !== null,
          },
          passwordHash: user.password,
          passwordVersion: user.passwordVersion,
          emailVerified: user.emailVerifiedAt !== null,
        }
      : null;
  }
}

interface InMemoryCredentialUser extends UserAccount {
  passwordHash: string | null;
  emailVerified: boolean;
  passwordVersion: number;
  lastLoginAt: Date | null;
  active?: boolean;
}

export class InMemoryCredentialStore implements CredentialStore {
  private readonly users = new Map<string, InMemoryCredentialUser>();

  seed(user: InMemoryCredentialUser): void {
    this.users.set(user.id, user);
  }

  get(userId: string): InMemoryCredentialUser | undefined {
    return this.users.get(userId);
  }

  findByEmail(email: string): Promise<CredentialRecord | null> {
    return Promise.resolve(
      this.record(
        [...this.users.values()].find((user) => user.email === email),
      ),
    );
  }

  findById(userId: string): Promise<CredentialRecord | null> {
    return Promise.resolve(this.record(this.users.get(userId)));
  }

  recordLogin(
    userId: string,
    expectedPasswordHash: string,
    at: Date,
  ): Promise<number | null> {
    const user = this.users.get(userId);
    if (
      !user ||
      user.active === false ||
      user.passwordHash !== expectedPasswordHash
    ) {
      return Promise.resolve(null);
    }
    user.lastLoginAt = at;
    return Promise.resolve(user.passwordVersion);
  }

  updatePassword(
    userId: string,
    expectedPasswordHash: string,
    passwordHash: string,
  ): Promise<number | null> {
    const user = this.users.get(userId);
    if (
      !user ||
      user.active === false ||
      user.passwordHash !== expectedPasswordHash
    ) {
      return Promise.resolve(null);
    }
    user.passwordHash = passwordHash;
    user.hasPassword = true;
    user.passwordVersion += 1;
    return Promise.resolve(user.passwordVersion);
  }

  private record(user?: InMemoryCredentialUser): CredentialRecord | null {
    if (!user || user.active === false) return null;
    return {
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
        hasPassword: user.hasPassword,
      },
      passwordHash: user.passwordHash,
      passwordVersion: user.passwordVersion,
      emailVerified: user.emailVerified,
    };
  }
}
