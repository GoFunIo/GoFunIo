import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, QueryFailedError, Repository } from 'typeorm';
import { CreateCompanyUserDto } from './dtos/create-company-user.dto';
import { UpdateCompanyUserDto } from './dtos/update-company-user.dto';
import {
  PASSWORD_RESET_REQUESTED_EVENT,
  PasswordResetRequestedEvent,
} from './events/password-reset-requested.event';
import { generateVerificationToken } from './verification-token.util';
import { User, UserRole } from './users.entity';
import {
  clearExpiredEmailClaims,
  emailClaimInUse,
  lockEmailClaim,
} from './email-claim.util';

@Injectable()
export class CompanyUsersService {
  constructor(
    @InjectRepository(User)
    private readonly users: Repository<User>,
    private readonly config: ConfigService,
    private readonly events: EventEmitter2,
  ) {}

  list(companyId: string): Promise<User[]> {
    return this.users.find({
      where: { companyId },
      order: { createdAt: 'ASC' },
    });
  }

  async create(
    actor: User,
    body: CreateCompanyUserDto,
    origin?: string,
  ): Promise<User> {
    const email = body.email.trim().toLowerCase();
    const ttlHours = this.config.get<number>(
      'PASSWORD_RESET_TOKEN_TTL_HOURS',
      24,
    );
    const { token, tokenHash, expiresAt } = generateVerificationToken(ttlHours);

    let user: User;
    try {
      user = await this.users.manager.transaction(async (manager) => {
        const admins = await this.lockAdmins(manager, actor.companyId);
        this.requireAdmin(admins, actor.id);
        await lockEmailClaim(manager, email);
        await clearExpiredEmailClaims(manager, email);
        if (await emailClaimInUse(manager, email)) {
          throw new ConflictException('Email already in use');
        }
        return manager.save(
          manager.create(User, {
            companyId: actor.companyId,
            email,
            firstName: body.firstName ?? null,
            lastName: body.lastName ?? null,
            role: body.role,
            password: null,
            emailVerifiedAt: null,
            passwordResetTokenHash: tokenHash,
            passwordResetTokenExpiresAt: expiresAt,
          }),
        );
      });
    } catch (error) {
      if (this.isUniqueViolation(error)) {
        throw new ConflictException('Email already in use');
      }
      throw error;
    }

    this.events.emit(
      PASSWORD_RESET_REQUESTED_EVENT,
      new PasswordResetRequestedEvent(
        user.id,
        user.email,
        token,
        ttlHours,
        origin,
        true,
      ),
    );
    return user;
  }

  async update(
    actor: User,
    id: string,
    body: UpdateCompanyUserDto,
  ): Promise<User> {
    if (Object.keys(body).length === 0) {
      throw new BadRequestException('No changes provided');
    }
    if (id === actor.id && body.role && body.role !== UserRole.ADMIN) {
      throw new ConflictException('Cannot demote yourself');
    }

    return this.users.manager.transaction(async (manager) => {
      const admins = await this.lockAdmins(manager, actor.companyId);
      this.requireAdmin(admins, actor.id);
      const target = await this.findCompanyUser(manager, actor.companyId, id);
      if (
        target.role === UserRole.ADMIN &&
        body.role === UserRole.MANAGER &&
        admins.length <= 1
      ) {
        throw new ConflictException('Company must have an admin');
      }

      Object.assign(target, body);
      return manager.save(target);
    });
  }

  async remove(actor: User, id: string): Promise<void> {
    if (id === actor.id) {
      throw new ConflictException('Cannot delete yourself');
    }

    await this.users.manager.transaction(async (manager) => {
      const admins = await this.lockAdmins(manager, actor.companyId);
      this.requireAdmin(admins, actor.id);
      const target = await this.findCompanyUser(manager, actor.companyId, id);
      if (target.role === UserRole.ADMIN && admins.length <= 1) {
        throw new ConflictException('Company must have an admin');
      }
      await manager.update(User, target.id, {
        pendingEmail: null,
        emailChangeTokenHash: null,
        emailChangeTokenExpiresAt: null,
        verificationTokenHash: null,
        verificationTokenExpiresAt: null,
        passwordResetTokenHash: null,
        passwordResetTokenExpiresAt: null,
      });
      await manager.softDelete(User, target.id);
    });
  }

  private async findCompanyUser(
    manager: EntityManager,
    companyId: string,
    id: string,
  ): Promise<User> {
    const user = await manager.findOne(User, {
      where: { id, companyId },
      lock: { mode: 'pessimistic_write' },
    });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  private lockAdmins(
    manager: EntityManager,
    companyId: string,
  ): Promise<User[]> {
    return manager
      .createQueryBuilder(User, 'user')
      .innerJoin('user.company', 'company')
      .where('user.companyId = :companyId', { companyId })
      .andWhere('user.role = :role', { role: UserRole.ADMIN })
      .andWhere('company."deletedAt" IS NULL')
      .orderBy('user.id', 'ASC')
      .setLock('pessimistic_write')
      .getMany();
  }

  private requireAdmin(admins: User[], actorId: string): void {
    if (!admins.some(({ id }) => id === actorId)) {
      throw new ForbiddenException();
    }
  }

  private isUniqueViolation(error: unknown): boolean {
    if (!(error instanceof QueryFailedError)) return false;
    return (
      (error.driverError as { code?: string } | undefined)?.code === '23505'
    );
  }
}
