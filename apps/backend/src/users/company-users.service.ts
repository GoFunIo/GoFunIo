import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { Company } from '../companies/companies.entity';
import { VEHICLE_ACCESS, type VehicleAccess } from '../fleet/vehicle-access';
import { CreateCompanyUserDto } from './dtos/create-company-user.dto';
import { UpdateCompanyUserDto } from './dtos/update-company-user.dto';
import {
  assertEmailClaimable,
  rethrowEmailClaimError,
} from './email-claim.util';
import { Membership } from './membership.entity';
import { MembershipRole } from './membership-role';
import { PasswordRecoveryService } from './password-recovery.service';
import { requireCompanyId, type SessionPrincipal } from './session-principal';
import { User } from './users.entity';

export type CompanyUser = User & {
  companyId: string;
  role: MembershipRole;
};

@Injectable()
export class CompanyUsersService {
  constructor(
    @InjectRepository(User)
    private readonly users: Repository<User>,
    private readonly passwordRecovery: PasswordRecoveryService,
    @Inject(VEHICLE_ACCESS) private readonly vehicleAccess: VehicleAccess,
  ) {}

  async list(companyId: string): Promise<CompanyUser[]> {
    const { entities, raw } = await this.users
      .createQueryBuilder('user')
      .innerJoin(
        Membership,
        'membership',
        'membership."userId" = user.id AND membership."companyId" = :companyId AND membership.status = :status',
        { companyId, status: 'active' },
      )
      .addSelect('membership.role', 'contextRole')
      .orderBy('membership.createdAt', 'ASC')
      .addOrderBy('user.id', 'ASC')
      .getRawAndEntities();
    return entities.map((user, index) =>
      this.contextualUser(
        user,
        companyId,
        raw[index].contextRole as MembershipRole,
      ),
    );
  }

  async create(
    actor: SessionPrincipal,
    body: CreateCompanyUserDto,
    origin?: string,
  ): Promise<CompanyUser> {
    const email = body.email.trim().toLowerCase();
    const companyId = requireCompanyId(actor);
    let user: CompanyUser;
    try {
      user = await this.users.manager.transaction(async (manager) => {
        const memberships = await this.lockActiveMemberships(
          manager,
          companyId,
        );
        this.requireAdmin(memberships, actor.id);
        await assertEmailClaimable(
          manager,
          email,
          () => new ConflictException('Email already in use'),
        );
        const created = await manager.save(
          manager.create(User, {
            email,
            firstName: body.firstName ?? null,
            lastName: body.lastName ?? null,
            password: null,
            emailVerifiedAt: null,
          }),
        );
        await manager.save(
          manager.create(Membership, {
            userId: created.id,
            companyId,
            role: body.role,
          }),
        );
        return this.contextualUser(created, companyId, body.role);
      });
    } catch (error) {
      rethrowEmailClaimError(
        error,
        () => new ConflictException('Email already in use'),
      );
    }

    // ponytail: use an outbox if guaranteed first-password delivery becomes required.
    await this.passwordRecovery.issueFirstPassword(user.id, origin);
    return user;
  }

  async update(
    actor: SessionPrincipal,
    id: string,
    body: UpdateCompanyUserDto,
  ): Promise<CompanyUser> {
    if (Object.keys(body).length === 0) {
      throw new BadRequestException('No changes provided');
    }
    if (id === actor.id && body.role && body.role !== MembershipRole.ADMIN) {
      throw new ConflictException('Cannot demote yourself');
    }
    const companyId = requireCompanyId(actor);
    const result = await this.users.manager.transaction(async (manager) => {
      const memberships = await this.lockActiveMemberships(manager, companyId);
      this.requireAdmin(memberships, actor.id);
      const { membership, user } = await this.findCompanyUser(
        manager,
        memberships,
        id,
      );
      const admins = memberships.filter(
        ({ role }) => role === MembershipRole.ADMIN,
      );
      if (
        membership.role === MembershipRole.ADMIN &&
        body.role === MembershipRole.MANAGER &&
        admins.length <= 1
      ) {
        throw new ConflictException('Company must have an admin');
      }

      const cleanupManager =
        membership.role === MembershipRole.MANAGER &&
        body.role === MembershipRole.ADMIN;
      const { role, ...profile } = body;
      Object.assign(user, profile);
      if (role) {
        membership.role = role;
        await manager.save(membership);
      }
      if (cleanupManager) {
        await this.vehicleAccess.closeManager(companyId, id);
      }
      const saved = await manager.save(user);
      return this.contextualUser(saved, companyId, membership.role);
    });
    return result;
  }

  async remove(actor: SessionPrincipal, id: string): Promise<void> {
    if (id === actor.id) {
      throw new ConflictException('Cannot delete yourself');
    }
    const companyId = requireCompanyId(actor);
    await this.users.manager.transaction(async (manager) => {
      const memberships = await this.lockActiveMemberships(manager, companyId);
      this.requireAdmin(memberships, actor.id);
      const { membership } = await this.findCompanyUser(
        manager,
        memberships,
        id,
      );
      const adminCount = memberships.filter(
        ({ role }) => role === MembershipRole.ADMIN,
      ).length;
      if (membership.role === MembershipRole.ADMIN && adminCount <= 1) {
        throw new ConflictException('Company must have an admin');
      }
      await this.deactivateMembership(manager, membership);
      if (membership.role === MembershipRole.MANAGER) {
        await this.vehicleAccess.closeManager(companyId, id);
      }
      await this.softDeleteIfEmpty(manager, companyId);
    });
  }

  async leave(actor: SessionPrincipal): Promise<void> {
    const companyId = requireCompanyId(actor);
    await this.users.manager.transaction(async (manager) => {
      const memberships = await this.lockActiveMemberships(manager, companyId);
      const { membership } = await this.findCompanyUser(
        manager,
        memberships,
        actor.id,
      );
      const adminCount = memberships.filter(
        ({ role }) => role === MembershipRole.ADMIN,
      ).length;
      if (membership.role === MembershipRole.ADMIN && adminCount <= 1) {
        throw new ConflictException(
          'Promote another admin or delete the company before leaving',
        );
      }
      await this.deactivateMembership(manager, membership);
      if (membership.role === MembershipRole.MANAGER) {
        await this.vehicleAccess.closeManager(companyId, actor.id);
      }
      await this.softDeleteIfEmpty(manager, companyId);
    });
  }

  private async findCompanyUser(
    manager: EntityManager,
    memberships: Membership[],
    id: string,
  ): Promise<{ membership: Membership; user: User }> {
    const membership = memberships.find(({ userId }) => userId === id);
    if (!membership) throw new NotFoundException('User not found');
    const user = await manager.findOne(User, {
      where: { id },
      lock: { mode: 'pessimistic_write' },
    });
    if (!user) throw new NotFoundException('User not found');
    return { membership, user };
  }

  private lockActiveMemberships(
    manager: EntityManager,
    companyId: string,
  ): Promise<Membership[]> {
    return manager
      .createQueryBuilder(Membership, 'membership')
      .innerJoin(
        Company,
        'company',
        'company.id = membership."companyId" AND company."deletedAt" IS NULL',
      )
      .where('membership."companyId" = :companyId', { companyId })
      .andWhere('membership.status = :status', { status: 'active' })
      .orderBy('membership.id', 'ASC')
      .setLock('pessimistic_write')
      .getMany();
  }

  private requireAdmin(memberships: Membership[], actorId: string): void {
    if (
      !memberships.some(
        ({ userId, role }) =>
          userId === actorId && role === MembershipRole.ADMIN,
      )
    ) {
      throw new ForbiddenException();
    }
  }

  private async deactivateMembership(
    manager: EntityManager,
    membership: Membership,
  ): Promise<void> {
    Object.assign(membership, {
      status: 'removed',
      tokenHash: null,
      tokenExpiresAt: null,
    });
    await manager.save(membership);
  }

  private async softDeleteIfEmpty(
    manager: EntityManager,
    companyId: string,
  ): Promise<void> {
    if (
      await manager.exists(Membership, {
        where: { companyId, status: 'active' },
      })
    ) {
      return;
    }
    await manager.softDelete(Company, companyId);
    await manager.update(
      Membership,
      { companyId },
      { status: 'removed', tokenHash: null, tokenExpiresAt: null },
    );
  }

  private contextualUser(
    user: User,
    companyId: string,
    role: MembershipRole,
  ): CompanyUser {
    return Object.assign(user, { companyId, role });
  }
}
