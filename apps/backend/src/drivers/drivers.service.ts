import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryFailedError, Repository } from 'typeorm';
import {
  FLEET_UNIT_OF_WORK,
  type FleetUnitOfWork,
} from '../fleet/fleet-unit-of-work';
import {
  requireCompanyId,
  type SessionPrincipal,
} from '../users/session-principal';
import { CreateDriverAssignmentDto } from './dtos/create-driver-assignment.dto';
import { CreateDriverDto } from './dtos/create-driver.dto';
import { UpdateDriverDto } from './dtos/update-driver.dto';
import { DriverVehicleAssignment } from './driver-vehicle-assignment.entity';
import { Driver } from './drivers.entity';

@Injectable()
export class DriversService {
  constructor(
    @InjectRepository(Driver)
    private readonly drivers: Repository<Driver>,
    @Inject(FLEET_UNIT_OF_WORK) private readonly fleet: FleetUnitOfWork,
  ) {}

  list(actor: SessionPrincipal): Promise<Driver[]> {
    if (!actor.companyId) return Promise.resolve([]);
    return this.drivers.find({
      where: { companyId: actor.companyId },
      order: { lastName: 'ASC', firstName: 'ASC', id: 'ASC' },
    });
  }

  async findOne(actor: SessionPrincipal, id: string): Promise<Driver> {
    const driver = await this.drivers.findOneBy({
      id,
      companyId: requireCompanyId(actor),
    });
    if (!driver) throw new NotFoundException('Driver not found');
    return driver;
  }

  create(actor: SessionPrincipal, body: CreateDriverDto): Promise<Driver> {
    return this.drivers.save(
      this.drivers.create({
        ...body,
        companyId: requireCompanyId(actor),
        email: body.email ?? null,
        phone: body.phone ?? null,
        notes: body.notes ?? null,
      }),
    );
  }

  async update(
    actor: SessionPrincipal,
    id: string,
    body: UpdateDriverDto,
  ): Promise<Driver> {
    if (Object.keys(body).length === 0) {
      throw new BadRequestException('No changes provided');
    }
    return this.drivers.manager.transaction(async (manager) => {
      const driver = await manager.findOne(Driver, {
        where: { id, companyId: requireCompanyId(actor) },
        lock: { mode: 'pessimistic_write' },
      });
      if (!driver) throw new NotFoundException('Driver not found');
      Object.assign(driver, body);
      return manager.save(driver);
    });
  }

  async remove(actor: SessionPrincipal, id: string): Promise<void> {
    await this.drivers.manager.transaction(async (manager) => {
      const driver = await manager.findOne(Driver, {
        where: { id, companyId: requireCompanyId(actor) },
        lock: { mode: 'pessimistic_write' },
      });
      if (!driver) throw new NotFoundException('Driver not found');
      await manager
        .createQueryBuilder()
        .update(DriverVehicleAssignment)
        .set({ assignedTo: () => 'clock_timestamp()' })
        .where('"companyId" = :companyId', {
          companyId: requireCompanyId(actor),
        })
        .andWhere('"driverId" = :driverId', { driverId: id })
        .andWhere('"assignedTo" IS NULL')
        .execute();
      await manager.softDelete(Driver, id);
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
    try {
      return await this.fleet.transact(async (fleet) => {
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
    } catch (error) {
      if (
        error instanceof QueryFailedError &&
        (error.driverError as { constraint?: string } | undefined)
          ?.constraint === 'IDX_driver_assignments_active_pair'
      ) {
        throw new ConflictException('Driver already assigned');
      }
      throw error;
    }
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
