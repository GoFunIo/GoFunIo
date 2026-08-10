import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './users.entity';
import { Membership } from './membership.entity';

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
    membershipId?: string,
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
    membershipId?: string,
  ): Promise<PasswordRecoveryTarget | null> {
    return this.users.manager.transaction(async (manager) => {
      const result = await this.assign(
        'id = :userId',
        { userId },
        tokenHash,
        expiresAt,
        true,
        manager.getRepository(User),
      );
      const target = this.target(result);
      if (!target || !membershipId) return target;
      const linked = await manager.update(
        Membership,
        { id: membershipId, userId, status: 'pending' },
        { tokenHash, tokenExpiresAt: expiresAt },
      );
      if (linked.affected !== 1) {
        throw new Error('Cannot link first password to invitation');
      }
      return target;
    });
  }

  async consume(
    tokenHash: string,
    passwordHash: string,
    now: Date,
  ): Promise<boolean> {
    return this.users.manager.transaction(async (manager) => {
      const user = await manager
        .createQueryBuilder(User, 'user')
        .addSelect('user.password')
        .where('user.passwordResetTokenHash = :tokenHash', { tokenHash })
        .andWhere('user.passwordResetTokenExpiresAt > :now', { now })
        .andWhere('user.deletedAt IS NULL')
        .setLock('pessimistic_write')
        .getOne();
      if (!user) return false;

      const firstPassword = user.password === null;
      const invitation = firstPassword
        ? await manager
            .createQueryBuilder(Membership, 'membership')
            .where('membership.userId = :userId', { userId: user.id })
            .andWhere('membership.status = :status', { status: 'pending' })
            .andWhere('membership.tokenHash = :tokenHash', { tokenHash })
            .andWhere('membership.tokenExpiresAt > :now', { now })
            .setLock('pessimistic_write')
            .getOne()
        : null;
      const result = await manager.update(
        User,
        { id: user.id, passwordResetTokenHash: tokenHash },
        {
          password: passwordHash,
          emailVerifiedAt: firstPassword
            ? (user.emailVerifiedAt ?? now)
            : user.emailVerifiedAt,
          passwordResetTokenHash: null,
          passwordResetTokenExpiresAt: null,
          passwordVersion: () => '"passwordVersion" + 1',
        },
      );
      if (result.affected !== 1) return false;
      if (invitation) {
        await manager.update(
          Membership,
          { id: invitation.id, status: 'pending', tokenHash },
          { status: 'active', tokenHash: null, tokenExpiresAt: null },
        );
      }
      return true;
    });
  }

  private assign(
    where: string,
    parameters: Record<string, string>,
    tokenHash: string,
    expiresAt: Date,
    firstPasswordOnly = false,
    users = this.users,
  ) {
    let query = users
      .createQueryBuilder()
      .update(User)
      .set({
        passwordResetTokenHash: tokenHash,
        passwordResetTokenExpiresAt: expiresAt,
      })
      .where(where, parameters)
      .andWhere('"deletedAt" IS NULL');
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
    _membershipId?: string,
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
