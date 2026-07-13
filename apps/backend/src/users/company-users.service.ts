import {
  BadRequestException,
  ConflictException,
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
import { UsersService } from './users.service';

@Injectable()
export class CompanyUsersService {
  constructor(
    @InjectRepository(User)
    private readonly users: Repository<User>,
    private readonly usersService: UsersService,
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
    companyId: string,
    body: CreateCompanyUserDto,
    origin?: string,
  ): Promise<User> {
    const email = body.email.trim().toLowerCase();
    await this.usersService.clearExpiredEmailChangeClaims(email);
    if (await this.usersService.emailInUse(email)) {
      throw new ConflictException('Email already in use');
    }

    const ttlHours = this.config.get<number>(
      'PASSWORD_RESET_TOKEN_TTL_HOURS',
      24,
    );
    const { token, tokenHash, expiresAt } = generateVerificationToken(ttlHours);

    let user: User;
    try {
      user = await this.users.save(
        this.users.create({
          companyId,
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
      const target = await this.findCompanyUser(manager, actor.companyId, id);
      if (target.role === UserRole.ADMIN && admins.length <= 1) {
        throw new ConflictException('Company must have an admin');
      }
      await manager.softRemove(target);
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
      .where('user.companyId = :companyId', { companyId })
      .andWhere('user.role = :role', { role: UserRole.ADMIN })
      .orderBy('user.id', 'ASC')
      .setLock('pessimistic_write')
      .getMany();
  }

  private isUniqueViolation(error: unknown): boolean {
    if (!(error instanceof QueryFailedError)) return false;
    return (
      (error.driverError as { code?: string } | undefined)?.code === '23505'
    );
  }
}
