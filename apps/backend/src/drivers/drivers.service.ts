import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
} from '@nestjs/common';
import {
  DRIVER_ALLOCATION,
  type DriverAllocation,
} from '../fleet/driver-allocation';
import {
  FLEET_UNIT_OF_WORK,
  type FleetUnitOfWork,
} from '../fleet/fleet-unit-of-work';
import {
  requireCompanyId,
  type SessionPrincipal,
} from '../users/session-principal';
import { isWorkspaceAdmin } from '../users/membership-role';
import { CreateDriverAssignmentDto } from './dtos/create-driver-assignment.dto';
import { CreateDriverDto } from './dtos/create-driver.dto';
import { UpdateDriverDto } from './dtos/update-driver.dto';
import { DriverVehicleAssignment } from './driver-vehicle-assignment.entity';
import { Driver } from './drivers.entity';

@Injectable()
export class DriversService {
  constructor(
    @Inject(FLEET_UNIT_OF_WORK) private readonly fleet: FleetUnitOfWork,
    @Inject(DRIVER_ALLOCATION)
    private readonly driverAllocation: DriverAllocation,
  ) {}

  async list(actor: SessionPrincipal): Promise<Driver[]> {
    if (!actor.companyId) return Promise.resolve([]);
    return (await this.driverAllocation.list(actor)).map((driver) =>
      Object.assign(new Driver(), driver),
    );
  }

  async findOne(actor: SessionPrincipal, id: string): Promise<Driver> {
    return Object.assign(
      new Driver(),
      await this.driverAllocation.find(actor, id),
    );
  }

  create(actor: SessionPrincipal, body: CreateDriverDto): Promise<Driver> {
    return this.fleet.transact(async (fleet) => {
      await fleet.driverAllocations.requireActor(actor);
      if (body.userId !== undefined && !isWorkspaceAdmin(actor.role)) {
        throw new ForbiddenException();
      }
      return Object.assign(
        new Driver(),
        await fleet.drivers.create({
          ...body,
          companyId: requireCompanyId(actor),
          userId: body.userId ?? null,
          email: body.email ?? null,
          phone: body.phone ?? null,
          notes: body.notes ?? null,
        }),
      );
    });
  }

  async update(
    actor: SessionPrincipal,
    id: string,
    body: UpdateDriverDto,
  ): Promise<Driver> {
    if (Object.keys(body).length === 0) {
      throw new BadRequestException('No changes provided');
    }
    return this.fleet.transact(async (fleet) => {
      await fleet.driverAllocations.requireActor(actor);
      if (body.userId !== undefined && !isWorkspaceAdmin(actor.role)) {
        throw new ForbiddenException();
      }
      await fleet.driverAllocations.find(actor, id, true);
      return Object.assign(new Driver(), await fleet.drivers.update(id, body));
    });
  }

  async remove(actor: SessionPrincipal, id: string): Promise<void> {
    await this.fleet.transact(async (fleet) => {
      if (!isWorkspaceAdmin(actor.role)) throw new ForbiddenException();
      const companyId = requireCompanyId(actor);
      await fleet.driverAllocations.requireActor(actor);
      await fleet.driverAllocations.find(actor, id, true);
      await fleet.driverAllocations.closeDriver(companyId, id);
      await fleet.drivers.softDelete(id);
    });
  }

  async assignmentHistory(actor: SessionPrincipal, vehicleId: string) {
    return this.fleet.transact(async (fleet) => {
      const companyId = requireCompanyId(actor);
      await fleet.vehicleAccess.findForHistory(actor, vehicleId);
      return fleet.driverAllocations.history(companyId, vehicleId);
    });
  }

  async assign(
    actor: SessionPrincipal,
    vehicleId: string,
    body: CreateDriverAssignmentDto,
  ): Promise<DriverVehicleAssignment> {
    return this.fleet.transact(async (fleet) => {
      const companyId = requireCompanyId(actor);
      if (!actor.role) throw new ForbiddenException();
      await fleet.vehicleAccess.requireActor(companyId, actor.id, actor.role);
      await fleet.vehicleAccess.find(actor, vehicleId, true);
      await fleet.drivers.requireOne(companyId, body.driverId);
      return Object.assign(
        new DriverVehicleAssignment(),
        await fleet.driverAllocations.assign(
          companyId,
          vehicleId,
          body.driverId,
        ),
      );
    });
  }

  async unassign(
    actor: SessionPrincipal,
    vehicleId: string,
    driverId: string,
  ): Promise<void> {
    await this.fleet.transact(async (fleet) => {
      const companyId = requireCompanyId(actor);
      if (!actor.role) throw new ForbiddenException();
      await fleet.vehicleAccess.requireActor(companyId, actor.id, actor.role);
      await fleet.vehicleAccess.find(actor, vehicleId, true);
      await fleet.driverAllocations.unassign(companyId, vehicleId, driverId);
    });
  }
}
