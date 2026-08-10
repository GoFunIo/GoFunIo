import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  EntityManager,
  In,
  IsNull,
  QueryFailedError,
  Repository,
} from 'typeorm';
import { DriverVehicleAssignment } from '../drivers/driver-vehicle-assignment.entity';
import { Driver } from '../drivers/drivers.entity';
import { MembershipRole } from '../users/membership-role';
import {
  requireCompanyId,
  type SessionPrincipal,
} from '../users/session-principal';
import { User } from '../users/users.entity';
import { CreateVehicleDto } from './dtos/create-vehicle.dto';
import {
  ListVehiclesQueryDto,
  SortOrder,
  VehicleExpiryType,
  VehicleSortBy,
} from './dtos/list-vehicles-query.dto';
import { UpdateVehicleDto } from './dtos/update-vehicle.dto';
import { ManagerVehicleAssignment } from './manager-vehicle-assignment.entity';
import { Vehicle } from './vehicles.entity';

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
export class VehiclesService {
  constructor(
    @InjectRepository(Vehicle)
    private readonly vehicles: Repository<Vehicle>,
  ) {}

  async list(actor: SessionPrincipal, query: ListVehiclesQueryDto) {
    const qb = this.vehicles
      .createQueryBuilder('vehicle')
      .where('vehicle.companyId = :companyId', {
        companyId: requireCompanyId(actor),
      })
      .andWhere('vehicle.deletedAt IS NULL');
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
        {
          today,
          end: this.dateOnly(end),
        },
      );
    }

    const order = query.sortOrder === SortOrder.ASC ? 'ASC' : 'DESC';
    qb.orderBy(sortColumns[query.sortBy], order, 'NULLS LAST')
      .addOrderBy('vehicle.id', order)
      .skip((query.page - 1) * query.pageSize)
      .take(query.pageSize);

    const [items, total] = await qb.getManyAndCount();
    await this.loadActiveAssignments(this.vehicles.manager, items);
    return {
      items,
      page: query.page,
      pageSize: query.pageSize,
      total,
      totalPages: Math.ceil(total / query.pageSize),
    };
  }

  async findOne(actor: SessionPrincipal, id: string): Promise<Vehicle> {
    const vehicle = await this.findAccessibleVehicle(
      this.vehicles.manager,
      actor,
      id,
    );
    await this.loadActiveAssignments(this.vehicles.manager, [vehicle]);
    return vehicle;
  }

  async create(
    actor: SessionPrincipal,
    body: CreateVehicleDto,
  ): Promise<Vehicle> {
    this.validateProductionYear(body.productionYear);
    this.validatePurchaseDate(body.purchaseDate);
    try {
      return await this.vehicles.manager.transaction(async (manager) => {
        const companyId = requireCompanyId(actor);
        await this.lockActor(manager, actor.id);
        const { managerIds, driverIds, ...vehicleFields } = body;
        if (
          actor.role === MembershipRole.MANAGER &&
          managerIds !== undefined
        ) {
          throw new ForbiddenException();
        }

        const activeManagerIds =
          actor.role === MembershipRole.MANAGER
            ? [actor.id]
            : await this.validateManagerIds(
                manager,
                companyId,
                managerIds ?? [],
              );
        const activeDriverIds = await this.validateDriverIds(
          manager,
          companyId,
          driverIds ?? [],
        );
        const vehicle = await manager.save(
          manager.create(Vehicle, {
            ...vehicleFields,
            companyId,
            productionYear: body.productionYear ?? null,
            fuelType: body.fuelType ?? null,
            vin: body.vin ?? null,
            currentMileage: body.currentMileage ?? null,
            purchaseDate: body.purchaseDate ?? null,
            ocExpiry: body.ocExpiry ?? null,
            acExpiry: body.acExpiry ?? null,
            technicalInspectionExpiry: body.technicalInspectionExpiry ?? null,
            notes: body.notes ?? null,
          }),
        );

        if (activeManagerIds.length) {
          await manager.save(
            activeManagerIds.map((managerId) =>
              manager.create(ManagerVehicleAssignment, {
                companyId,
                managerId,
                vehicleId: vehicle.id,
              }),
            ),
          );
        }
        if (activeDriverIds.length) {
          await manager.save(
            activeDriverIds.map((driverId) =>
              manager.create(DriverVehicleAssignment, {
                companyId,
                driverId,
                vehicleId: vehicle.id,
              }),
            ),
          );
        }
        vehicle.managerIds = activeManagerIds;
        vehicle.driverIds = activeDriverIds;
        return vehicle;
      });
    } catch (error) {
      this.throwConflict(error);
    }
  }

  async update(
    actor: SessionPrincipal,
    id: string,
    body: UpdateVehicleDto,
  ): Promise<Vehicle> {
    if (Object.keys(body).length === 0) {
      throw new BadRequestException('No changes provided');
    }
    this.validateProductionYear(body.productionYear);
    this.validatePurchaseDate(body.purchaseDate);
    try {
      return await this.vehicles.manager.transaction(async (manager) => {
        const companyId = requireCompanyId(actor);
        await this.lockActor(manager, actor.id);
        const { managerIds, ...vehicleFields } = body;
        if (
          actor.role === MembershipRole.MANAGER &&
          managerIds !== undefined
        ) {
          throw new ForbiddenException();
        }
        const vehicle = await this.findAccessibleVehicle(
          manager,
          actor,
          id,
          true,
        );
        if (managerIds !== undefined) {
          const validIds = await this.validateManagerIds(
            manager,
            companyId,
            managerIds,
          );
          await this.syncManagerAssignments(manager, vehicle, validIds);
        }
        Object.assign(vehicle, vehicleFields);
        await manager.save(vehicle);
        await this.loadActiveAssignments(manager, [vehicle]);
        return vehicle;
      });
    } catch (error) {
      this.throwConflict(error);
    }
  }

  async remove(actor: SessionPrincipal, id: string): Promise<void> {
    await this.vehicles.manager.transaction(async (manager) => {
      const companyId = requireCompanyId(actor);
      await this.lockActor(manager, actor.id);
      const vehicle = await this.findAccessibleVehicle(
        manager,
        actor,
        id,
        true,
      );
      await this.closeActiveAssignments(
        manager,
        ManagerVehicleAssignment,
        companyId,
        id,
      );
      await this.closeActiveAssignments(
        manager,
        DriverVehicleAssignment,
        companyId,
        id,
      );
      await manager.softDelete(Vehicle, vehicle.id);
    });
  }

  async managerHistory(actor: SessionPrincipal, id: string) {
    await this.findVehicleForHistory(this.vehicles.manager, actor, id);
    return this.vehicles.manager.find(ManagerVehicleAssignment, {
      where: { companyId: requireCompanyId(actor), vehicleId: id },
      order: { assignedFrom: 'DESC', createdAt: 'DESC' },
    });
  }

  async findAccessibleVehicle(
    manager: EntityManager,
    actor: SessionPrincipal,
    id: string,
    lock = false,
  ): Promise<Vehicle> {
    const qb = manager
      .createQueryBuilder(Vehicle, 'vehicle')
      .where('vehicle.id = :id', { id })
      .andWhere('vehicle.companyId = :companyId', {
        companyId: requireCompanyId(actor),
      })
      .andWhere('vehicle.deletedAt IS NULL');
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
    if (lock) qb.setLock('pessimistic_write');
    const vehicle = await qb.getOne();
    if (!vehicle) throw new NotFoundException('Vehicle not found');
    return vehicle;
  }

  async findVehicleForHistory(
    manager: EntityManager,
    actor: SessionPrincipal,
    id: string,
  ): Promise<Vehicle> {
    if (actor.role === MembershipRole.MANAGER) {
      return this.findAccessibleVehicle(manager, actor, id);
    }
    const vehicle = await manager
      .createQueryBuilder(Vehicle, 'vehicle')
      .withDeleted()
      .where('vehicle.id = :id', { id })
      .andWhere('vehicle.companyId = :companyId', {
        companyId: requireCompanyId(actor),
      })
      .getOne();
    if (!vehicle) throw new NotFoundException('Vehicle not found');
    return vehicle;
  }

  private async syncManagerAssignments(
    manager: EntityManager,
    vehicle: Vehicle,
    managerIds: string[],
  ): Promise<void> {
    const active = await manager.find(ManagerVehicleAssignment, {
      where: {
        companyId: vehicle.companyId,
        vehicleId: vehicle.id,
        assignedTo: IsNull(),
      },
      lock: { mode: 'pessimistic_write' },
    });
    const requested = new Set(managerIds);
    const existing = new Set(active.map(({ managerId }) => managerId));
    const removed = active.filter(({ managerId }) => !requested.has(managerId));
    if (removed.length) {
      await manager
        .createQueryBuilder()
        .update(ManagerVehicleAssignment)
        .set({ assignedTo: () => 'clock_timestamp()' })
        .whereInIds(removed.map(({ id }) => id))
        .execute();
    }
    const added = managerIds.filter((managerId) => !existing.has(managerId));
    if (added.length) {
      await manager.save(
        added.map((managerId) =>
          manager.create(ManagerVehicleAssignment, {
            companyId: vehicle.companyId,
            managerId,
            vehicleId: vehicle.id,
          }),
        ),
      );
    }
  }

  private async loadActiveAssignments(
    manager: EntityManager,
    vehicles: Vehicle[],
  ): Promise<void> {
    if (!vehicles.length) return;
    const vehicleIds = vehicles.map(({ id }) => id);
    const [managerAssignments, driverAssignments] = await Promise.all([
      manager.find(ManagerVehicleAssignment, {
        where: { vehicleId: In(vehicleIds), assignedTo: IsNull() },
      }),
      manager.find(DriverVehicleAssignment, {
        where: { vehicleId: In(vehicleIds), assignedTo: IsNull() },
      }),
    ]);
    for (const vehicle of vehicles) {
      vehicle.managerIds = managerAssignments
        .filter(({ vehicleId }) => vehicleId === vehicle.id)
        .map(({ managerId }) => managerId);
      vehicle.driverIds = driverAssignments
        .filter(({ vehicleId }) => vehicleId === vehicle.id)
        .map(({ driverId }) => driverId);
    }
  }

  private async closeActiveAssignments(
    manager: EntityManager,
    entity: typeof ManagerVehicleAssignment | typeof DriverVehicleAssignment,
    companyId: string,
    vehicleId: string,
  ): Promise<void> {
    await manager
      .createQueryBuilder()
      .update(entity)
      .set({ assignedTo: () => 'clock_timestamp()' })
      .where('"companyId" = :companyId', { companyId })
      .andWhere('"vehicleId" = :vehicleId', { vehicleId })
      .andWhere('"assignedTo" IS NULL')
      .execute();
  }

  private async validateManagerIds(
    manager: EntityManager,
    companyId: string,
    managerIds: string[],
  ): Promise<string[]> {
    if (!managerIds.length) return [];
    const users = await manager.find(User, {
      where: { id: In(managerIds), companyId, role: MembershipRole.MANAGER },
      lock: { mode: 'pessimistic_write' },
    });
    if (users.length !== managerIds.length) {
      throw new BadRequestException('Invalid manager');
    }
    return managerIds;
  }

  private async validateDriverIds(
    manager: EntityManager,
    companyId: string,
    driverIds: string[],
  ): Promise<string[]> {
    if (!driverIds.length) return [];
    const drivers = await manager.find(Driver, {
      where: { id: In(driverIds), companyId },
      lock: { mode: 'pessimistic_write' },
    });
    if (drivers.length !== driverIds.length) {
      throw new BadRequestException('Invalid driver');
    }
    return driverIds;
  }

  private async lockActor(
    manager: EntityManager,
    actorId: string,
  ): Promise<void> {
    const current = await manager.findOne(User, {
      where: { id: actorId },
      lock: { mode: 'pessimistic_write' },
    });
    if (!current) throw new ForbiddenException();
  }

  private validatePurchaseDate(value?: string | null): void {
    if (value && value > this.dateOnly(new Date())) {
      throw new BadRequestException('Purchase date cannot be in the future');
    }
  }

  private validateProductionYear(value?: number | null): void {
    if (value && value > new Date().getFullYear()) {
      throw new BadRequestException('Production year cannot be in the future');
    }
  }

  private escapeLike(value: string): string {
    return value.replace(/[!%_]/g, '!$&');
  }

  private dateOnly(value: Date): string {
    return value.toISOString().slice(0, 10);
  }

  private throwConflict(error: unknown): never {
    if (error instanceof QueryFailedError) {
      const constraint = (
        error.driverError as { constraint?: string } | undefined
      )?.constraint;
      if (constraint === 'IDX_vehicles_company_registration_active') {
        throw new ConflictException('Registration number already in use');
      }
      if (constraint === 'IDX_vehicles_company_vin_active') {
        throw new ConflictException('VIN already in use');
      }
      if (constraint === 'IDX_manager_assignments_active_pair') {
        throw new ConflictException('Manager already assigned');
      }
      if (constraint === 'IDX_driver_assignments_active_pair') {
        throw new ConflictException('Driver already assigned');
      }
    }
    throw error;
  }
}
