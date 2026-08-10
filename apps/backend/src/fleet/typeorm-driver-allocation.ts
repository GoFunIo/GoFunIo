import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import {
  DataSource,
  EntityManager,
  In,
  IsNull,
  QueryFailedError,
  SelectQueryBuilder,
} from 'typeorm';
import { DriverVehicleAssignment } from '../drivers/driver-vehicle-assignment.entity';
import { Driver } from '../drivers/drivers.entity';
import { Membership } from '../users/membership.entity';
import { MembershipRole } from '../users/membership-role';
import {
  requireCompanyId,
  type SessionPrincipal,
} from '../users/session-principal';
import { ManagerVehicleAssignment } from '../vehicles/manager-vehicle-assignment.entity';
import type {
  DriverAllocation,
  DriverAllocationStore,
} from './driver-allocation';

@Injectable()
export class TypeOrmDriverAllocation implements DriverAllocation {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  list(actor: SessionPrincipal): Promise<Driver[]> {
    return this.visibleDrivers(this.dataSource.manager, actor)
      .orderBy('driver.lastName', 'ASC')
      .addOrderBy('driver.firstName', 'ASC')
      .addOrderBy('driver.id', 'ASC')
      .getMany();
  }

  find(actor: SessionPrincipal, driverId: string): Promise<Driver> {
    return this.findVisible(this.dataSource.manager, actor, driverId);
  }

  activeDriverIds(
    companyId: string,
    vehicleIds: string[],
  ): Promise<Map<string, string[]>> {
    return this.activeIds(this.dataSource.manager, companyId, vehicleIds);
  }

  transactionStore(manager: EntityManager): DriverAllocationStore {
    return {
      requireActor: (actor) => this.requireActor(manager, actor),
      find: (actor, driverId, lock = false) =>
        this.findVisible(manager, actor, driverId, lock),
      assign: (companyId, vehicleId, driverId) =>
        this.assign(manager, companyId, vehicleId, driverId),
      assignInitial: (companyId, vehicleId, driverIds) =>
        this.assignInitial(manager, companyId, vehicleId, driverIds),
      unassign: (companyId, vehicleId, driverId) =>
        this.unassign(manager, companyId, vehicleId, driverId),
      history: (companyId, vehicleId) =>
        manager.find(DriverVehicleAssignment, {
          where: { companyId, vehicleId },
          order: { assignedFrom: 'DESC', createdAt: 'DESC' },
        }),
      activeDriverIds: (companyId, vehicleIds) =>
        this.activeIds(manager, companyId, vehicleIds),
      closeDriver: (companyId, driverId) =>
        this.close(manager, companyId, 'driverId', driverId),
      closeVehicle: (companyId, vehicleId) =>
        this.close(manager, companyId, 'vehicleId', vehicleId),
    };
  }

  private visibleDrivers(
    manager: EntityManager,
    actor: SessionPrincipal,
  ): SelectQueryBuilder<Driver> {
    const companyId = requireCompanyId(actor);
    if (
      actor.role !== MembershipRole.ADMIN &&
      actor.role !== MembershipRole.MANAGER
    ) {
      throw new ForbiddenException();
    }
    const qb = manager
      .createQueryBuilder(Driver, 'driver')
      .where('driver.companyId = :companyId', { companyId })
      .andWhere(
        `EXISTS (
          SELECT 1 FROM "memberships" actor_membership
          WHERE actor_membership."userId" = :actorId
            AND actor_membership."companyId" = driver."companyId"
            AND actor_membership.role = :actorRole
            AND actor_membership.status = 'active'
        )`,
        { actorId: actor.id, actorRole: actor.role },
      );
    if (actor.role === MembershipRole.MANAGER) {
      qb.andWhere(
        `(NOT EXISTS (
          SELECT 1 FROM "driver_vehicle_assignments" allocation
          WHERE allocation."driverId" = driver.id
            AND allocation."companyId" = driver."companyId"
            AND allocation."assignedTo" IS NULL
        ) OR EXISTS (
          SELECT 1 FROM "driver_vehicle_assignments" allocation
          JOIN "manager_vehicle_assignments" access
            ON access."vehicleId" = allocation."vehicleId"
            AND access."companyId" = allocation."companyId"
            AND access."assignedTo" IS NULL
          WHERE allocation."driverId" = driver.id
            AND allocation."companyId" = driver."companyId"
            AND allocation."assignedTo" IS NULL
            AND access."managerId" = :managerId
        ))`,
        { managerId: actor.id },
      );
    }
    return qb;
  }

  private async requireActor(
    manager: EntityManager,
    actor: SessionPrincipal,
  ): Promise<void> {
    if (
      actor.role !== MembershipRole.ADMIN &&
      actor.role !== MembershipRole.MANAGER
    ) {
      throw new ForbiddenException();
    }
    const membership = await manager.findOne(Membership, {
      where: {
        companyId: requireCompanyId(actor),
        userId: actor.id,
        role: actor.role,
        status: 'active',
      },
      lock: { mode: 'pessimistic_write' },
    });
    if (!membership) throw new ForbiddenException();
  }

  private async findVisible(
    manager: EntityManager,
    actor: SessionPrincipal,
    driverId: string,
    lock = false,
  ): Promise<Driver> {
    const qb = this.visibleDrivers(manager, actor).andWhere(
      'driver.id = :driverId',
      { driverId },
    );
    if (lock) qb.setLock('pessimistic_write');
    const driver = await qb.getOne();
    if (!driver) throw new NotFoundException('Driver not found');
    return driver;
  }

  private async assign(
    manager: EntityManager,
    companyId: string,
    vehicleId: string,
    driverId: string,
  ): Promise<DriverVehicleAssignment> {
    try {
      return await manager.save(
        manager.create(DriverVehicleAssignment, {
          companyId,
          vehicleId,
          driverId,
        }),
      );
    } catch (error) {
      this.throwActivePairConflict(error);
    }
  }

  private async assignInitial(
    manager: EntityManager,
    companyId: string,
    vehicleId: string,
    driverIds: string[],
  ): Promise<void> {
    if (!driverIds.length) return;
    try {
      await manager.save(
        driverIds.map((driverId) =>
          manager.create(DriverVehicleAssignment, {
            companyId,
            vehicleId,
            driverId,
          }),
        ),
      );
    } catch (error) {
      this.throwActivePairConflict(error);
    }
  }

  private async unassign(
    manager: EntityManager,
    companyId: string,
    vehicleId: string,
    driverId: string,
  ): Promise<void> {
    const assignment = await manager.findOne(DriverVehicleAssignment, {
      where: { companyId, vehicleId, driverId, assignedTo: IsNull() },
      lock: { mode: 'pessimistic_write' },
    });
    if (!assignment) throw new NotFoundException('Assignment not found');
    await manager
      .createQueryBuilder()
      .update(DriverVehicleAssignment)
      .set({ assignedTo: () => 'clock_timestamp()' })
      .where('id = :id', { id: assignment.id })
      .execute();
  }

  private async activeIds(
    manager: EntityManager,
    companyId: string,
    vehicleIds: string[],
  ): Promise<Map<string, string[]>> {
    const result = new Map(
      vehicleIds.map((vehicleId) => [vehicleId, [] as string[]]),
    );
    if (!vehicleIds.length) return result;
    const assignments = await manager.find(DriverVehicleAssignment, {
      select: { vehicleId: true, driverId: true },
      where: { companyId, vehicleId: In(vehicleIds), assignedTo: IsNull() },
    });
    for (const { vehicleId, driverId } of assignments) {
      result.get(vehicleId)?.push(driverId);
    }
    return result;
  }

  private async close(
    manager: EntityManager,
    companyId: string,
    field: 'driverId' | 'vehicleId',
    id: string,
  ): Promise<void> {
    await manager
      .createQueryBuilder()
      .update(DriverVehicleAssignment)
      .set({ assignedTo: () => 'clock_timestamp()' })
      .where('"companyId" = :companyId', { companyId })
      .andWhere(`"${field}" = :id`, { id })
      .andWhere('"assignedTo" IS NULL')
      .execute();
  }

  private throwActivePairConflict(error: unknown): never {
    if (
      error instanceof QueryFailedError &&
      (error.driverError as { constraint?: string } | undefined)?.constraint ===
        'IDX_driver_assignments_active_pair'
    ) {
      throw new ConflictException('Driver already assigned');
    }
    throw error;
  }
}
