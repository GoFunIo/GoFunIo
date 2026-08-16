import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, EntityManager, IsNull, SelectQueryBuilder } from 'typeorm';
import { Membership } from '../users/membership.entity';
import { isWorkspaceAdmin, MembershipRole } from '../users/membership-role';
import { User } from '../users/users.entity';
import {
  requireCompanyId,
  type SessionPrincipal,
} from '../users/session-principal';
import {
  ListVehiclesQueryDto,
  SortOrder,
  VehicleExpiryType,
  VehicleSortBy,
} from '../vehicles/dtos/list-vehicles-query.dto';
import { ManagerVehicleAssignment } from '../vehicles/manager-vehicle-assignment.entity';
import { Vehicle } from '../vehicles/vehicles.entity';
import type { FleetVehicleAccessStore } from './fleet-unit-of-work';
import type {
  FleetManagerAssignment,
  FleetManagerProjection,
  FleetVehiclePage,
  VehicleAccess,
} from './vehicle-access';
import type { TransactionalVehicleAccess } from './transactional-vehicle-access';

const sortColumns: Record<VehicleSortBy, string> = {
  [VehicleSortBy.CREATED_AT]: 'vehicle.createdAt',
  [VehicleSortBy.BRAND]: 'vehicle.brand',
  [VehicleSortBy.MODEL]: 'vehicle.model',
  [VehicleSortBy.PRODUCTION_YEAR]: 'vehicle.productionYear',
  [VehicleSortBy.CURRENT_MILEAGE]: 'vehicle.currentMileage',
  [VehicleSortBy.OC_EXPIRY]: 'vehicle.ocExpiry',
  [VehicleSortBy.AC_EXPIRY]: 'vehicle.acExpiry',
  [VehicleSortBy.INSPECTION_EXPIRY]: 'vehicle.technicalInspectionExpiry',
};

const expiryColumns: Record<VehicleExpiryType, string> = {
  [VehicleExpiryType.OC]: 'vehicle.ocExpiry',
  [VehicleExpiryType.AC]: 'vehicle.acExpiry',
  [VehicleExpiryType.INSPECTION]: 'vehicle.technicalInspectionExpiry',
};

@Injectable()
export class TypeOrmVehicleAccess
  implements VehicleAccess, TransactionalVehicleAccess
{
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  visible(actor: SessionPrincipal): Promise<Vehicle[]> {
    if (!actor.companyId) return Promise.resolve([]);
    return this.visibleVehicles(this.dataSource.manager, actor).getMany();
  }

  async list(
    actor: SessionPrincipal,
    query: ListVehiclesQueryDto,
  ): Promise<FleetVehiclePage> {
    if (!actor.companyId) {
      return {
        items: [],
        page: query.page,
        pageSize: query.pageSize,
        total: 0,
        totalPages: 0,
      };
    }
    const qb = this.visibleVehicles(this.dataSource.manager, actor);
    if (query.managerId) {
      qb.andWhere(
        `EXISTS (
          SELECT 1 FROM "manager_vehicle_assignments" selected_assignment
          WHERE selected_assignment."vehicleId" = vehicle.id
            AND selected_assignment."companyId" = vehicle."companyId"
            AND selected_assignment."managerId" = :selectedManagerId
            AND selected_assignment."assignedTo" IS NULL
        )`,
        { selectedManagerId: query.managerId },
      );
    }
    if (query.search) {
      const search = this.escapeLike(query.search);
      const compact = this.escapeLike(
        query.search.toUpperCase().replace(/[\s-]/g, ''),
      );
      qb.andWhere(
        `(vehicle.brand ILIKE :search ESCAPE '!'
          OR vehicle.model ILIKE :search ESCAPE '!'
          OR vehicle.vin ILIKE :compact ESCAPE '!'
          OR vehicle.registrationNumber ILIKE :compact ESCAPE '!')`,
        { search: `%${search}%`, compact: `%${compact}%` },
      );
    }
    if (query.expiresWithinDays && !query.expiryType) {
      throw new BadRequestException('expiryType is required');
    }
    if (query.expiryType) {
      const today = this.dateOnly(new Date());
      const end = new Date();
      end.setUTCDate(end.getUTCDate() + (query.expiresWithinDays ?? 30));
      qb.andWhere(
        `${expiryColumns[query.expiryType]} BETWEEN :today AND :end`,
        { today, end: this.dateOnly(end) },
      );
    }
    const order = query.sortOrder === SortOrder.ASC ? 'ASC' : 'DESC';
    qb.orderBy(sortColumns[query.sortBy], order, 'NULLS LAST')
      .addOrderBy('vehicle.id', order)
      .skip((query.page - 1) * query.pageSize)
      .take(query.pageSize);
    const [items, total] = await qb.getManyAndCount();
    return {
      items,
      page: query.page,
      pageSize: query.pageSize,
      total,
      totalPages: Math.ceil(total / query.pageSize),
    };
  }

  find(actor: SessionPrincipal, vehicleId: string): Promise<Vehicle> {
    return this.findVisible(this.dataSource.manager, actor, vehicleId);
  }

  async history(
    actor: SessionPrincipal,
    vehicleId: string,
  ): Promise<FleetManagerAssignment[]> {
    await this.findForHistory(this.dataSource.manager, actor, vehicleId);
    return this.dataSource.manager.find(ManagerVehicleAssignment, {
      where: { companyId: requireCompanyId(actor), vehicleId },
      order: { assignedFrom: 'DESC', createdAt: 'DESC' },
    });
  }

  activeManagers(
    companyId: string,
    vehicleIds: string[],
  ): Promise<Map<string, FleetManagerProjection[]>> {
    return this.activeManagersFrom(
      this.dataSource.manager,
      companyId,
      vehicleIds,
    );
  }

  closeManager(
    manager: EntityManager,
    companyId: string,
    managerId: string,
  ): Promise<void> {
    return this.close(manager, companyId, 'managerId', managerId);
  }

  transactionStore(manager: EntityManager): FleetVehicleAccessStore {
    return {
      requireActor: async (companyId, userId, role) => {
        const membership = await manager.findOne(Membership, {
          where: { companyId, userId, role, status: 'active' },
          lock: { mode: 'pessimistic_write' },
        });
        if (!membership) throw new ForbiddenException();
      },
      find: (actor, vehicleId, lock = false) =>
        this.findVisible(manager, actor, vehicleId, lock),
      findForHistory: (actor, vehicleId) =>
        this.findForHistory(manager, actor, vehicleId),
      assign: (companyId, vehicleId, managerId) =>
        this.assign(manager, companyId, vehicleId, managerId),
      unassign: (companyId, vehicleId, managerId) =>
        this.unassign(manager, companyId, vehicleId, managerId),
      activeManagers: (companyId, vehicleIds) =>
        this.activeManagersFrom(manager, companyId, vehicleIds),
      closeVehicle: (companyId, vehicleId) =>
        this.close(manager, companyId, 'vehicleId', vehicleId),
    };
  }

  private visibleVehicles(
    manager: EntityManager,
    actor: SessionPrincipal,
    includeDeletedForAdmin = false,
  ): SelectQueryBuilder<Vehicle> {
    const companyId = requireCompanyId(actor);
    if (
      !isWorkspaceAdmin(actor.role) &&
      actor.role !== MembershipRole.MANAGER
    ) {
      throw new ForbiddenException();
    }
    const qb = manager
      .createQueryBuilder(Vehicle, 'vehicle')
      .where('vehicle.companyId = :companyId', { companyId })
      .andWhere(
        `EXISTS (
          SELECT 1 FROM "memberships" actor_membership
          WHERE actor_membership."userId" = :actorId
            AND actor_membership."companyId" = vehicle."companyId"
            AND actor_membership.role = :actorRole
            AND actor_membership.status = 'active'
        )`,
        { actorId: actor.id, actorRole: actor.role },
      );
    if (includeDeletedForAdmin && isWorkspaceAdmin(actor.role)) {
      qb.withDeleted();
    }
    if (actor.role === MembershipRole.MANAGER) {
      qb.andWhere(
        `EXISTS (
          SELECT 1 FROM "manager_vehicle_assignments" assignment
          WHERE assignment."vehicleId" = vehicle.id
            AND assignment."companyId" = vehicle."companyId"
            AND assignment."managerId" = :managerId
            AND assignment."assignedTo" IS NULL
        )`,
        { managerId: actor.id },
      );
    }
    return qb;
  }

  private async findVisible(
    manager: EntityManager,
    actor: SessionPrincipal,
    vehicleId: string,
    lock = false,
  ): Promise<Vehicle> {
    const qb = this.visibleVehicles(manager, actor).andWhere(
      'vehicle.id = :vehicleId',
      { vehicleId },
    );
    if (lock) qb.setLock('pessimistic_write');
    const vehicle = await qb.getOne();
    if (!vehicle) throw new NotFoundException('Vehicle not found');
    return vehicle;
  }

  private async findForHistory(
    manager: EntityManager,
    actor: SessionPrincipal,
    vehicleId: string,
  ): Promise<Vehicle> {
    const vehicle = await this.visibleVehicles(manager, actor, true)
      .andWhere('vehicle.id = :vehicleId', { vehicleId })
      .getOne();
    if (!vehicle) throw new NotFoundException('Vehicle not found');
    return vehicle;
  }

  private async assign(
    manager: EntityManager,
    companyId: string,
    vehicleId: string,
    managerId: string,
  ): Promise<ManagerVehicleAssignment> {
    const membership = await manager.findOne(Membership, {
      where: {
        userId: managerId,
        companyId,
        role: MembershipRole.MANAGER,
        status: 'active',
      },
      lock: { mode: 'pessimistic_write' },
    });
    if (!membership) throw new BadRequestException('Invalid manager');
    const active = await manager.findOne(ManagerVehicleAssignment, {
      where: { companyId, vehicleId, managerId, assignedTo: IsNull() },
      lock: { mode: 'pessimistic_write' },
    });
    if (active) return active;
    return manager.save(
      manager.create(ManagerVehicleAssignment, {
        companyId,
        vehicleId,
        managerId,
      }),
    );
  }

  private async unassign(
    manager: EntityManager,
    companyId: string,
    vehicleId: string,
    managerId: string,
  ): Promise<void> {
    const assignment = await manager.findOne(ManagerVehicleAssignment, {
      where: { companyId, vehicleId, managerId, assignedTo: IsNull() },
      lock: { mode: 'pessimistic_write' },
    });
    if (!assignment) throw new NotFoundException('Assignment not found');
    await manager
      .createQueryBuilder()
      .update(ManagerVehicleAssignment)
      .set({ assignedTo: () => 'clock_timestamp()' })
      .where('id = :id', { id: assignment.id })
      .execute();
  }

  private async activeManagersFrom(
    manager: EntityManager,
    companyId: string,
    vehicleIds: string[],
  ): Promise<Map<string, FleetManagerProjection[]>> {
    const result = new Map(
      vehicleIds.map((vehicleId) => [
        vehicleId,
        [] as FleetManagerProjection[],
      ]),
    );
    if (!vehicleIds.length) return result;
    const assignments = await manager
      .createQueryBuilder(ManagerVehicleAssignment, 'assignment')
      .innerJoin(
        Membership,
        'membership',
        `membership."userId" = assignment."managerId"
          AND membership."companyId" = assignment."companyId"
          AND membership.status = :status
          AND membership.role = :role`,
        { status: 'active', role: MembershipRole.MANAGER },
      )
      .innerJoin(User, 'user', 'user.id = membership."userId"')
      .select('assignment.vehicleId', 'vehicleId')
      .addSelect('user.id', 'id')
      .addSelect('user.firstName', 'firstName')
      .addSelect('user.lastName', 'lastName')
      .addSelect('user.email', 'email')
      .where('assignment.companyId = :companyId', { companyId })
      .andWhere('assignment.vehicleId IN (:...vehicleIds)', { vehicleIds })
      .andWhere('assignment.assignedTo IS NULL')
      .getRawMany<FleetManagerProjection & { vehicleId: string }>();
    for (const { vehicleId, ...profile } of assignments) {
      result.get(vehicleId)?.push(profile);
    }
    return result;
  }

  private async close(
    manager: EntityManager,
    companyId: string,
    field: 'managerId' | 'vehicleId',
    id: string,
  ): Promise<void> {
    await manager
      .createQueryBuilder()
      .update(ManagerVehicleAssignment)
      .set({ assignedTo: () => 'clock_timestamp()' })
      .where('"companyId" = :companyId', { companyId })
      .andWhere(`"${field}" = :id`, { id })
      .andWhere('"assignedTo" IS NULL')
      .execute();
  }

  private escapeLike(value: string): string {
    return value.replace(/[!%_]/g, '!$&');
  }

  private dateOnly(value: Date): string {
    return value.toISOString().slice(0, 10);
  }
}
