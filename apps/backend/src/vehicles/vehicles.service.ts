import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, IsNull, QueryFailedError, Repository } from 'typeorm';
import { DriverVehicleAssignment } from '../drivers/driver-vehicle-assignment.entity';
import {
  FLEET_UNIT_OF_WORK,
  type FleetUnitOfWork,
} from '../fleet/fleet-unit-of-work';
import { VEHICLE_ACCESS, type VehicleAccess } from '../fleet/vehicle-access';
import { MembershipRole } from '../users/membership-role';
import {
  requireCompanyId,
  type SessionPrincipal,
} from '../users/session-principal';
import { CreateVehicleDto } from './dtos/create-vehicle.dto';
import { ListVehiclesQueryDto } from './dtos/list-vehicles-query.dto';
import { UpdateVehicleDto } from './dtos/update-vehicle.dto';
import { Vehicle } from './vehicles.entity';

@Injectable()
export class VehiclesService {
  constructor(
    @InjectRepository(Vehicle)
    private readonly vehicles: Repository<Vehicle>,
    @Inject(FLEET_UNIT_OF_WORK) private readonly fleet: FleetUnitOfWork,
    @Inject(VEHICLE_ACCESS) private readonly vehicleAccess: VehicleAccess,
  ) {}

  async list(actor: SessionPrincipal, query: ListVehiclesQueryDto) {
    const page = await this.vehicleAccess.list(actor, query);
    const items = page.items.map((vehicle) =>
      Object.assign(new Vehicle(), vehicle),
    );
    await this.loadActiveAssignments(actor.companyId, items);
    return { ...page, items };
  }

  async findOne(actor: SessionPrincipal, id: string): Promise<Vehicle> {
    const vehicle = Object.assign(
      new Vehicle(),
      await this.vehicleAccess.find(actor, id),
    );
    await this.loadActiveAssignments(actor.companyId, [vehicle]);
    return vehicle;
  }

  async create(
    actor: SessionPrincipal,
    body: CreateVehicleDto,
  ): Promise<Vehicle> {
    this.validateProductionYear(body.productionYear);
    this.validatePurchaseDate(body.purchaseDate);
    try {
      const companyId = requireCompanyId(actor);
      const { managerIds, driverIds, ...vehicleFields } = body;
      if (actor.role === MembershipRole.MANAGER && managerIds !== undefined) {
        throw new ForbiddenException();
      }
      const activeManagerIds =
        actor.role === MembershipRole.MANAGER ? [actor.id] : (managerIds ?? []);
      const activeDriverIds = driverIds ?? [];
      const vehicle = await this.fleet.transact(async (fleet) => {
        if (!actor.role) throw new ForbiddenException();
        await fleet.vehicleAccess.requireActor(companyId, actor.id, actor.role);
        const created = await fleet.vehicles.create({
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
        });
        await fleet.vehicleAccess.sync(companyId, created.id, activeManagerIds);
        await fleet.drivers.requireAll(companyId, activeDriverIds);
        await fleet.driverAllocations.assignInitial(
          companyId,
          created.id,
          activeDriverIds,
        );
        return created;
      });
      return Object.assign(new Vehicle(), vehicle, {
        managerIds: activeManagerIds,
        driverIds: activeDriverIds,
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
      return await this.fleet.transact(async (fleet) => {
        const companyId = requireCompanyId(actor);
        const { managerIds, ...vehicleFields } = body;
        if (actor.role === MembershipRole.MANAGER && managerIds !== undefined) {
          throw new ForbiddenException();
        }
        if (!actor.role) throw new ForbiddenException();
        await fleet.vehicleAccess.requireActor(companyId, actor.id, actor.role);
        await fleet.vehicleAccess.find(actor, id, true);
        if (managerIds !== undefined) {
          await fleet.vehicleAccess.sync(companyId, id, managerIds);
        }
        const vehicle = await fleet.vehicles.update(id, vehicleFields);
        const [managerIdsByVehicle, driverIdsByVehicle] = await Promise.all([
          fleet.vehicleAccess.activeManagerIds(companyId, [id]),
          fleet.driverAllocations.activeDriverIds(companyId, [id]),
        ]);
        return Object.assign(new Vehicle(), vehicle, {
          managerIds: managerIdsByVehicle.get(id) ?? [],
          driverIds: driverIdsByVehicle.get(id) ?? [],
        });
      });
    } catch (error) {
      this.throwConflict(error);
    }
  }

  async remove(actor: SessionPrincipal, id: string): Promise<void> {
    await this.fleet.transact(async (fleet) => {
      const companyId = requireCompanyId(actor);
      if (!actor.role) throw new ForbiddenException();
      await fleet.vehicleAccess.requireActor(companyId, actor.id, actor.role);
      await fleet.vehicleAccess.find(actor, id, true);
      await fleet.vehicleAccess.closeVehicle(companyId, id);
      await fleet.driverAllocations.closeVehicle(companyId, id);
      await fleet.vehicles.softDelete(id);
    });
  }

  async managerHistory(actor: SessionPrincipal, id: string) {
    return this.vehicleAccess.history(actor, id);
  }

  private async loadActiveAssignments(
    companyId: string | null,
    vehicles: Vehicle[],
  ): Promise<void> {
    if (!vehicles.length || !companyId) return;
    const vehicleIds = vehicles.map(({ id }) => id);
    const [managerAssignments, driverAssignments] = await Promise.all([
      this.vehicleAccess.activeManagerIds(companyId, vehicleIds),
      this.vehicles.manager.find(DriverVehicleAssignment, {
        where: { companyId, vehicleId: In(vehicleIds), assignedTo: IsNull() },
      }),
    ]);
    for (const vehicle of vehicles) {
      vehicle.managerIds = managerAssignments.get(vehicle.id) ?? [];
      vehicle.driverIds = driverAssignments
        .filter(({ vehicleId }) => vehicleId === vehicle.id)
        .map(({ driverId }) => driverId);
    }
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
