import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
} from '@nestjs/common';
import { QueryFailedError } from 'typeorm';
import {
  DRIVER_ALLOCATION,
  type DriverAllocation,
} from '../fleet/driver-allocation';
import {
  FLEET_UNIT_OF_WORK,
  type FleetUnitOfWork,
  type FleetVehicle,
  type FleetVehicleAccessStore,
} from '../fleet/fleet-unit-of-work';
import {
  VEHICLE_ACCESS,
  type FleetVehiclePage,
  type VehicleAccess,
} from '../fleet/vehicle-access';
import { MembershipRole } from '../users/membership-role';
import {
  requireCompanyId,
  type SessionPrincipal,
} from '../users/session-principal';
import { CreateVehicleDto } from './dtos/create-vehicle.dto';
import { ListVehiclesQueryDto } from './dtos/list-vehicles-query.dto';
import { UpdateVehicleDto } from './dtos/update-vehicle.dto';
import type { VehicleView } from './vehicle-view';

@Injectable()
export class VehiclesService {
  constructor(
    @Inject(FLEET_UNIT_OF_WORK) private readonly fleet: FleetUnitOfWork,
    @Inject(VEHICLE_ACCESS) private readonly vehicleAccess: VehicleAccess,
    @Inject(DRIVER_ALLOCATION)
    private readonly driverAllocation: DriverAllocation,
  ) {}

  async list(
    actor: SessionPrincipal,
    query: ListVehiclesQueryDto,
  ): Promise<
    Omit<FleetVehiclePage, 'items'> & {
      items: VehicleView[];
    }
  > {
    const page = await this.vehicleAccess.list(actor, query);
    if (!page.items.length || !actor.companyId) return { ...page, items: [] };
    return {
      ...page,
      items: await this.views(
        actor.companyId,
        page.items,
        this.vehicleAccess,
        this.driverAllocation,
      ),
    };
  }

  async findOne(actor: SessionPrincipal, id: string): Promise<VehicleView> {
    const vehicle = await this.vehicleAccess.find(actor, id);
    return (
      await this.views(
        requireCompanyId(actor),
        [vehicle],
        this.vehicleAccess,
        this.driverAllocation,
      )
    )[0];
  }

  async create(
    actor: SessionPrincipal,
    body: CreateVehicleDto,
  ): Promise<VehicleView> {
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
      return await this.fleet.transact(async (fleet) => {
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
        return (
          await this.views(
            companyId,
            [created],
            fleet.vehicleAccess,
            fleet.driverAllocations,
          )
        )[0];
      });
    } catch (error) {
      this.throwConflict(error);
    }
  }

  async update(
    actor: SessionPrincipal,
    id: string,
    body: UpdateVehicleDto,
  ): Promise<VehicleView> {
    if (Object.keys(body).length === 0) {
      throw new BadRequestException('No changes provided');
    }
    this.validateProductionYear(body.productionYear);
    this.validatePurchaseDate(body.purchaseDate);
    try {
      const companyId = requireCompanyId(actor);
      return await this.fleet.transact(async (fleet) => {
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
        return (
          await this.views(
            companyId,
            [vehicle],
            fleet.vehicleAccess,
            fleet.driverAllocations,
          )
        )[0];
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

  private async views(
    companyId: string,
    vehicles: FleetVehicle[],
    vehicleAccess: Pick<FleetVehicleAccessStore, 'activeManagerIds'>,
    driverAllocation: Pick<DriverAllocation, 'activeDriverIds'>,
  ): Promise<VehicleView[]> {
    const vehicleIds = vehicles.map(({ id }) => id);
    const [managerIds, driverIds] = await Promise.all([
      vehicleAccess.activeManagerIds(companyId, vehicleIds),
      driverAllocation.activeDriverIds(companyId, vehicleIds),
    ]);
    return vehicles.map((vehicle) => ({
      ...vehicle,
      managerIds: managerIds.get(vehicle.id) ?? [],
      driverIds: driverIds.get(vehicle.id) ?? [],
    }));
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
    }
    throw error;
  }
}
