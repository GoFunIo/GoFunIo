import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, EntityManager, IsNull, SelectQueryBuilder } from 'typeorm';
import { DriverVehicleAssignment } from '../drivers/driver-vehicle-assignment.entity';
import { Driver } from '../drivers/drivers.entity';
import { Membership } from '../users/membership.entity';
import { isWorkspaceAdmin, MembershipRole } from '../users/membership-role';
import {
  requireCompanyId,
  type SessionPrincipal,
} from '../users/session-principal';
import { Vehicle } from '../vehicles/vehicles.entity';
import type {
  DriverAllocation,
  DriverAllocationStore,
  FleetActiveVehicleProjection,
  FleetDriverProjection,
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

  activeVehicles(
    actor: SessionPrincipal,
    driverIds: string[],
  ): Promise<Map<string, FleetActiveVehicleProjection[]>> {
    return this.activeVehiclesFrom(this.dataSource.manager, actor, driverIds);
  }

  activeDrivers(
    companyId: string,
    vehicleIds: string[],
  ): Promise<Map<string, FleetDriverProjection[]>> {
    return this.activeDriversFrom(
      this.dataSource.manager,
      companyId,
      vehicleIds,
    );
  }

  transactionStore(manager: EntityManager): DriverAllocationStore {
    return {
      requireActor: (actor) => this.requireActor(manager, actor),
      find: (actor, driverId, lock = false) =>
        this.findVisible(manager, actor, driverId, lock),
      assign: (companyId, vehicleId, driverId) =>
        this.assign(manager, companyId, vehicleId, driverId),
      unassign: (companyId, vehicleId, driverId) =>
        this.unassign(manager, companyId, vehicleId, driverId),
      history: (companyId, vehicleId) =>
        manager.find(DriverVehicleAssignment, {
          where: { companyId, vehicleId },
          order: { assignedFrom: 'DESC', createdAt: 'DESC' },
        }),
      activeDrivers: (companyId, vehicleIds) =>
        this.activeDriversFrom(manager, companyId, vehicleIds),
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
      !isWorkspaceAdmin(actor.role) &&
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
      !isWorkspaceAdmin(actor.role) &&
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
    await manager.findOne(Vehicle, {
      where: { id: vehicleId, companyId },
      lock: { mode: 'pessimistic_write' },
    });
    const active = await manager.findOne(DriverVehicleAssignment, {
      where: { companyId, vehicleId, driverId, assignedTo: IsNull() },
      lock: { mode: 'pessimistic_write' },
    });
    if (active) return active;
    return manager.save(
      manager.create(DriverVehicleAssignment, {
        companyId,
        vehicleId,
        driverId,
      }),
    );
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

  private async activeDriversFrom(
    manager: EntityManager,
    companyId: string,
    vehicleIds: string[],
  ): Promise<Map<string, FleetDriverProjection[]>> {
    const result = new Map<string, FleetDriverProjection[]>(
      vehicleIds.map((vehicleId) => [vehicleId, []]),
    );
    if (!vehicleIds.length) return result;
    const assignments = await manager
      .createQueryBuilder(DriverVehicleAssignment, 'assignment')
      .innerJoin(
        Driver,
        'driver',
        'driver.id = assignment."driverId" AND driver."companyId" = assignment."companyId"',
      )
      .select('assignment.vehicleId', 'vehicleId')
      .addSelect('driver.id', 'id')
      .addSelect('driver.firstName', 'firstName')
      .addSelect('driver.lastName', 'lastName')
      .where('assignment.companyId = :companyId', { companyId })
      .andWhere('assignment.vehicleId IN (:...vehicleIds)', { vehicleIds })
      .andWhere('assignment.assignedTo IS NULL')
      .getRawMany<FleetDriverProjection & { vehicleId: string }>();
    for (const { vehicleId, ...profile } of assignments) {
      result.get(vehicleId)?.push(profile);
    }
    return result;
  }

  private async activeVehiclesFrom(
    manager: EntityManager,
    actor: SessionPrincipal,
    driverIds: string[],
  ): Promise<Map<string, FleetActiveVehicleProjection[]>> {
    const result = new Map(
      driverIds.map((driverId) => [
        driverId,
        [] as FleetActiveVehicleProjection[],
      ]),
    );
    if (!driverIds.length) return result;
    const companyId = requireCompanyId(actor);
    if (
      !isWorkspaceAdmin(actor.role) &&
      actor.role !== MembershipRole.MANAGER
    ) {
      throw new ForbiddenException();
    }
    const qb = manager
      .createQueryBuilder(DriverVehicleAssignment, 'assignment')
      .innerJoin(
        Vehicle,
        'vehicle',
        'vehicle.id = assignment."vehicleId" AND vehicle."companyId" = assignment."companyId"',
      )
      .select('assignment.driverId', 'driverId')
      .addSelect('vehicle.id', 'id')
      .addSelect('vehicle.brand', 'brand')
      .addSelect('vehicle.model', 'model')
      .addSelect('vehicle.registrationNumber', 'registrationNumber')
      .where('assignment.companyId = :companyId', { companyId })
      .andWhere('assignment.driverId IN (:...driverIds)', { driverIds })
      .andWhere('assignment.assignedTo IS NULL')
      .andWhere('vehicle.deletedAt IS NULL')
      .andWhere(
        `EXISTS (
          SELECT 1 FROM "memberships" actor_membership
          WHERE actor_membership."userId" = :actorId
            AND actor_membership."companyId" = assignment."companyId"
            AND actor_membership.role = :actorRole
            AND actor_membership.status = 'active'
        )`,
        { actorId: actor.id, actorRole: actor.role },
      );
    if (actor.role === MembershipRole.MANAGER) {
      qb.andWhere(
        `EXISTS (
          SELECT 1 FROM "manager_vehicle_assignments" access
          WHERE access."vehicleId" = assignment."vehicleId"
            AND access."companyId" = assignment."companyId"
            AND access."managerId" = :managerId
            AND access."assignedTo" IS NULL
        )`,
        { managerId: actor.id },
      );
    }
    const assignments = await qb.getRawMany<
      FleetActiveVehicleProjection & { driverId: string }
    >();
    for (const { driverId, ...vehicle } of assignments) {
      result.get(driverId)?.push(vehicle);
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
}
