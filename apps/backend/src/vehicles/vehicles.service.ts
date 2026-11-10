import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
} from '@nestjs/common';
import { QueryFailedError } from 'typeorm';
import { ConflictCode, conflictException } from '../common/conflict';
import {
  DRIVER_ALLOCATION,
  type DriverAllocation,
} from '../fleet/driver-allocation';
import {
  FLEET_UNIT_OF_WORK,
  type FleetCustomDeadlineInput,
  type FleetUnitOfWork,
  type FleetVehicle,
  type FleetVehicleAccessStore,
} from '../fleet/fleet-unit-of-work';
import {
  VEHICLE_ACCESS,
  type FleetVehiclePage,
  type VehicleAccess,
} from '../fleet/vehicle-access';
import { isWorkspaceAdmin, MembershipRole } from '../users/membership-role';
import {
  requireCompanyId,
  type SessionPrincipal,
} from '../users/session-principal';
import { CreateVehicleDto } from './dtos/create-vehicle.dto';
import { CreateManagerAssignmentDto } from './dtos/create-manager-assignment.dto';
import { ListVehiclesQueryDto } from './dtos/list-vehicles-query.dto';
import { UpdateVehicleDto } from './dtos/update-vehicle.dto';
import type { VehicleCustomDeadlineInputDto } from './dtos/vehicle-custom-deadline-input.dto';
import type { VehicleView } from './vehicle-view';
import { VehicleDeadlineKind } from '../alert-policy/vehicle-deadline-alert-policy.entity';

const deadlineKindsByField = {
  ocExpiry: VehicleDeadlineKind.OC,
  acExpiry: VehicleDeadlineKind.AC,
  technicalInspectionExpiry: VehicleDeadlineKind.TECHNICAL_INSPECTION,
} as const;

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
    const vehicle = await this.vehicleAccess.findReadable(actor, id);
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
      const { customDeadlines = [], ...fields } = body;
      return await this.fleet.transact(async (fleet) => {
        if (
          !isWorkspaceAdmin(actor.role) &&
          actor.role !== MembershipRole.MANAGER
        ) {
          throw new ForbiddenException();
        }
        await fleet.vehicleAccess.requireActor(companyId, actor.id, actor.role);
        const created = await fleet.vehicles.create({
          ...fields,
          companyId,
          productionYear: fields.productionYear ?? null,
          fuelType: fields.fuelType ?? null,
          vin: fields.vin ?? null,
          currentMileage: fields.currentMileage ?? null,
          purchaseDate: fields.purchaseDate ?? null,
          ocExpiry: fields.ocExpiry ?? null,
          acExpiry: fields.acExpiry ?? null,
          technicalInspectionExpiry: fields.technicalInspectionExpiry ?? null,
          notes: fields.notes ?? null,
        });
        const changedCustomKinds = await fleet.vehicles.applyCustomDeadlines(
          companyId,
          created.id,
          this.customDeadlineInputs(customDeadlines),
        );
        if (actor.role === MembershipRole.MANAGER) {
          await fleet.vehicleAccess.assign(companyId, created.id, actor.id);
        }
        await fleet.notifications.persistVehicleDeadlineStages(created, [
          ...Object.values(VehicleDeadlineKind),
          ...changedCustomKinds,
        ]);
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
      const { customDeadlines = [], ...fields } = body;
      return await this.fleet.transact(async (fleet) => {
        if (!actor.role) throw new ForbiddenException();
        await fleet.vehicleAccess.requireActor(companyId, actor.id, actor.role);
        const existing = await fleet.vehicleAccess.find(actor, id, true);
        const vehicle = Object.keys(fields).length
          ? await fleet.vehicles.update(id, fields)
          : existing;
        const changedCustomKinds = await fleet.vehicles.applyCustomDeadlines(
          companyId,
          id,
          this.customDeadlineInputs(customDeadlines),
        );
        const changedKinds: string[] = Object.entries(deadlineKindsByField)
          .filter(
            ([field]) =>
              Object.prototype.hasOwnProperty.call(body, field) &&
              body[field as keyof typeof deadlineKindsByField] !==
                existing[field as keyof typeof deadlineKindsByField],
          )
          .map(([, kind]) => kind);
        await fleet.notifications.persistVehicleDeadlineStages(vehicle, [
          ...changedKinds,
          ...changedCustomKinds,
        ]);
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
    await this.fleet.transact((fleet) => fleet.vehicles.remove(actor, id));
  }

  async managerHistory(actor: SessionPrincipal, id: string) {
    return this.vehicleAccess.history(actor, id);
  }

  assignManager(
    actor: SessionPrincipal,
    vehicleId: string,
    body: CreateManagerAssignmentDto,
  ) {
    return this.fleet.transact(async (fleet) => {
      if (!isWorkspaceAdmin(actor.role)) throw new ForbiddenException();
      const companyId = requireCompanyId(actor);
      await fleet.vehicleAccess.requireActor(companyId, actor.id, actor.role);
      await fleet.vehicleAccess.find(actor, vehicleId, true);
      const assignment = await fleet.vehicleAccess.assign(
        companyId,
        vehicleId,
        body.managerId,
      );
      await fleet.notifications.reconcileVehicleDeadlineRecipients({
        companyId,
        vehicleIds: [vehicleId],
        userIds: [body.managerId],
      });
      return assignment;
    });
  }

  async unassignManager(
    actor: SessionPrincipal,
    vehicleId: string,
    managerId: string,
  ): Promise<void> {
    await this.fleet.transact(async (fleet) => {
      if (!isWorkspaceAdmin(actor.role)) throw new ForbiddenException();
      const companyId = requireCompanyId(actor);
      await fleet.vehicleAccess.requireActor(companyId, actor.id, actor.role);
      await fleet.vehicleAccess.find(actor, vehicleId, true);
      await fleet.vehicleAccess.unassign(companyId, vehicleId, managerId);
      await fleet.notifications.reconcileVehicleDeadlineRecipients({
        companyId,
        vehicleIds: [vehicleId],
        userIds: [managerId],
      });
    });
  }

  private async views(
    companyId: string,
    vehicles: FleetVehicle[],
    vehicleAccess: Pick<
      FleetVehicleAccessStore,
      'activeManagers' | 'customDeadlines'
    >,
    driverAllocation: Pick<DriverAllocation, 'activeDrivers'>,
  ): Promise<VehicleView[]> {
    const vehicleIds = vehicles.map(({ id }) => id);
    const [managers, drivers, customDeadlines] = await Promise.all([
      vehicleAccess.activeManagers(companyId, vehicleIds),
      driverAllocation.activeDrivers(companyId, vehicleIds),
      vehicleAccess.customDeadlines(companyId, vehicleIds),
    ]);
    return vehicles.map((vehicle) => ({
      ...vehicle,
      managers: managers.get(vehicle.id) ?? [],
      drivers: drivers.get(vehicle.id) ?? [],
      customDeadlines: customDeadlines.get(vehicle.id) ?? [],
    }));
  }

  private customDeadlineInputs(
    entries: VehicleCustomDeadlineInputDto[],
  ): FleetCustomDeadlineInput[] {
    return entries.map(({ kindId, date }) => ({
      kindId,
      date: date ?? null,
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
        throw conflictException(
          'Registration number already in use',
          ConflictCode.VEHICLE_REGISTRATION_IN_USE,
          'registrationNumber',
        );
      }
      if (constraint === 'IDX_vehicles_company_vin_active') {
        throw conflictException(
          'VIN already in use',
          ConflictCode.VEHICLE_VIN_IN_USE,
          'vin',
        );
      }
    }
    throw error;
  }
}
