import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, QueryFailedError, Repository } from 'typeorm';
import { CreateCompanyUserDto } from './dtos/create-company-user.dto';
import { UpdateCompanyUserDto } from './dtos/update-company-user.dto';
import { User } from './users.entity';
import { MembershipRole } from './membership-role';
import { Membership } from './membership.entity';
import type { SessionPrincipal } from './session-principal';
import { ManagerVehicleAssignment } from '../vehicles/manager-vehicle-assignment.entity';
import {
  clearExpiredEmailClaims,
  emailClaimInUse,
  lockEmailClaim,
} from './email-claim.util';
import { PasswordRecoveryService } from './password-recovery.service';

@Injectable()
export class CompanyUsersService {
  constructor(
    @InjectRepository(User)
    private readonly users: Repository<User>,
    private readonly passwordRecovery: PasswordRecoveryService,
  ) {}

  list(companyId: string): Promise<User[]> {
    return this.users.find({
      where: { companyId },
      order: { createdAt: 'ASC' },
    });
  }

  async create(
    actor: SessionPrincipal,
    body: CreateCompanyUserDto,
    origin?: string,
  ): Promise<User> {
    const email = body.email.trim().toLowerCase();

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
        const created = await manager.save(
          manager.create(User, {
            companyId: actor.companyId,
            email,
            firstName: body.firstName ?? null,
            lastName: body.lastName ?? null,
            role: body.role,
            password: null,
            emailVerifiedAt: null,
          }),
        );
        await manager.save(
          manager.create(Membership, {
            userId: created.id,
            companyId: created.companyId,
            role: created.role,
          }),
        );
        return created;
      });
    } catch (error) {
      if (this.isUniqueViolation(error)) {
        throw new ConflictException('Email already in use');
      }
      throw error;
    }

    // ponytail: post-commit issuance keeps transaction details out of the workflow seam; use an outbox if guaranteed activation is required.
    await this.passwordRecovery.issueFirstPassword(user.id, origin);
    return user;
  }

  async update(
    actor: SessionPrincipal,
    id: string,
    body: UpdateCompanyUserDto,
  ): Promise<User> {
    if (Object.keys(body).length === 0) {
      throw new BadRequestException('No changes provided');
    }
    if (id === actor.id && body.role && body.role !== MembershipRole.ADMIN) {
      throw new ConflictException('Cannot demote yourself');
    }

    return this.users.manager.transaction(async (manager) => {
      const admins = await this.lockAdmins(manager, actor.companyId);
      this.requireAdmin(admins, actor.id);
      const target = await this.findCompanyUser(manager, actor.companyId, id);
      if (
        target.role === MembershipRole.ADMIN &&
        body.role === MembershipRole.MANAGER &&
        admins.length <= 1
      ) {
        throw new ConflictException('Company must have an admin');
      }

      if (
        target.role === MembershipRole.MANAGER &&
        body.role === MembershipRole.ADMIN
      ) {
        await this.closeManagerAssignments(manager, actor.companyId, target.id);
      }

      Object.assign(target, body);
      return manager.save(target);
    });
  }

  async remove(actor: SessionPrincipal, id: string): Promise<void> {
    if (id === actor.id) {
      throw new ConflictException('Cannot delete yourself');
    }

    await this.users.manager.transaction(async (manager) => {
      const admins = await this.lockAdmins(manager, actor.companyId);
      this.requireAdmin(admins, actor.id);
      const target = await this.findCompanyUser(manager, actor.companyId, id);
      if (target.role === MembershipRole.ADMIN && admins.length <= 1) {
        throw new ConflictException('Company must have an admin');
      }
      if (target.role === MembershipRole.MANAGER) {
        await this.closeManagerAssignments(manager, actor.companyId, target.id);
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

  private async closeManagerAssignments(
    manager: EntityManager,
    companyId: string,
    managerId: string,
  ): Promise<void> {
    await manager
      .createQueryBuilder()
      .update(ManagerVehicleAssignment)
      .set({ assignedTo: () => 'clock_timestamp()' })
      .where('"companyId" = :companyId', { companyId })
      .andWhere('"managerId" = :managerId', { managerId })
      .andWhere('"assignedTo" IS NULL')
      .execute();
  }

  private lockAdmins(
    manager: EntityManager,
    companyId: string,
  ): Promise<User[]> {
    return manager
      .createQueryBuilder(User, 'user')
      .innerJoin('user.company', 'company')
      .where('user.companyId = :companyId', { companyId })
      .andWhere('user.role = :role', { role: MembershipRole.ADMIN })
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
