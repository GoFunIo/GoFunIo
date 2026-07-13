import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { User } from './users.entity';
import { InjectRepository } from '@nestjs/typeorm';
import {
  clearExpiredEmailClaims,
  emailClaimInUse,
  lockEmailClaim,
} from './email-claim.util';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {}

  async findOneById(id: string): Promise<User | null> {
    return this.usersRepository.findOneBy({ id });
  }

  private activeUsers(): SelectQueryBuilder<User> {
    return this.usersRepository
      .createQueryBuilder('user')
      .innerJoinAndSelect('user.company', 'company')
      .andWhere('company."deletedAt" IS NULL');
  }

  async findActiveById(id: string): Promise<User | null> {
    return this.activeUsers().andWhere('user.id = :id', { id }).getOne();
  }

  async findActiveByEmail(email: string): Promise<User | null> {
    return this.activeUsers()
      .andWhere('user.email = :email', { email })
      .getOne();
  }

  async findActiveByGoogleId(googleId: string): Promise<User | null> {
    return this.activeUsers()
      .andWhere('user.googleId = :googleId', { googleId })
      .getOne();
  }

  async create(user: Partial<User>): Promise<User> {
    const entity = this.usersRepository.create(user);
    return this.usersRepository.save(entity);
  }

  async findOneByVerificationTokenHash(hash: string): Promise<User | null> {
    return this.activeUsers()
      .addSelect([
        'user.verificationTokenHash',
        'user.verificationTokenExpiresAt',
      ])
      .andWhere('user.verificationTokenHash = :hash', { hash })
      .getOne();
  }

  async claimEmailChange(
    id: string,
    currentPassword: string,
    email: string,
    tokenHash: string,
    expiresAt: Date,
  ): Promise<boolean> {
    return this.usersRepository.manager.transaction(async (manager) => {
      await lockEmailClaim(manager, email);
      await clearExpiredEmailClaims(manager, email);
      if (await emailClaimInUse(manager, email, id)) {
        throw new ConflictException('Email already in use');
      }

      const result = await manager
        .createQueryBuilder()
        .update(User)
        .set({
          pendingEmail: email,
          emailChangeTokenHash: tokenHash,
          emailChangeTokenExpiresAt: expiresAt,
        })
        .where('id = :id', { id })
        .andWhere('password = :currentPassword', { currentPassword })
        .andWhere('"deletedAt" IS NULL')
        .execute();
      return (result.affected ?? 0) > 0;
    });
  }

  async consumeEmailChangeToken(tokenHash: string): Promise<boolean> {
    const result = await this.usersRepository
      .createQueryBuilder()
      .update(User)
      .set({
        email: () => '"pendingEmail"',
        pendingEmail: null,
        emailVerifiedAt: new Date(),
        emailChangeTokenHash: null,
        emailChangeTokenExpiresAt: null,
        passwordResetTokenHash: null,
        passwordResetTokenExpiresAt: null,
      })
      .where('"emailChangeTokenHash" = :tokenHash', { tokenHash })
      .andWhere('"emailChangeTokenExpiresAt" > :now', { now: new Date() })
      .andWhere('"pendingEmail" IS NOT NULL')
      .andWhere('"deletedAt" IS NULL')
      .execute();

    return (result.affected ?? 0) > 0;
  }

  async updatePassword(
    id: string,
    currentPassword: string,
    password: string,
  ): Promise<number | null> {
    const result = await this.usersRepository
      .createQueryBuilder()
      .update(User)
      .set({
        password,
        passwordVersion: () => '"passwordVersion" + 1',
        passwordResetTokenHash: null,
        passwordResetTokenExpiresAt: null,
      })
      .where('id = :id', { id })
      .andWhere('password = :currentPassword', { currentPassword })
      .andWhere('"deletedAt" IS NULL')
      .returning('"passwordVersion"')
      .execute();

    return (
      (result.raw as Array<{ passwordVersion: number }>)[0]?.passwordVersion ??
      null
    );
  }

  async consumePasswordResetToken(
    tokenHash: string,
    newPassword: string,
  ): Promise<boolean> {
    const result = await this.usersRepository
      .createQueryBuilder()
      .update(User)
      .set({
        password: newPassword,
        emailVerifiedAt: () =>
          'CASE WHEN "password" IS NULL THEN COALESCE("emailVerifiedAt", now()) ELSE "emailVerifiedAt" END',
        passwordResetTokenHash: null,
        passwordResetTokenExpiresAt: null,
        passwordVersion: () => '"passwordVersion" + 1',
      })
      .where('"passwordResetTokenHash" = :hash', { hash: tokenHash })
      .andWhere('"passwordResetTokenExpiresAt" > :now', { now: new Date() })
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

  async update(id: string, attrs: Partial<User>): Promise<User> {
    const user = await this.findOneById(id);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    Object.assign(user, attrs);
    return this.usersRepository.save(user);
  }

  async remove(id: string): Promise<void> {
    const user = await this.findOneById(id);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    await this.usersRepository.softDelete(id);
  }
}
