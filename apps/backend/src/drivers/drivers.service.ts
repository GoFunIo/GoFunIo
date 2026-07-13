import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, QueryFailedError, Repository } from 'typeorm';
import { User } from '../users/users.entity';
import { VehiclesService } from '../vehicles/vehicles.service';
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
    private readonly vehicles: VehiclesService,
  ) {}

  list(actor: User): Promise<Driver[]> {
    return this.drivers.find({
      where: { companyId: actor.companyId },
      order: { lastName: 'ASC', firstName: 'ASC', id: 'ASC' },
    });
  }

  async findOne(actor: User, id: string): Promise<Driver> {
    const driver = await this.drivers.findOneBy({
      id,
      companyId: actor.companyId,
    });
    if (!driver) throw new NotFoundException('Driver not found');
    return driver;
  }

  create(actor: User, body: CreateDriverDto): Promise<Driver> {
    return this.drivers.save(
      this.drivers.create({
        ...body,
        companyId: actor.companyId,
        email: body.email ?? null,
        phone: body.phone ?? null,
        notes: body.notes ?? null,
      }),
    );
  }

  async update(
    actor: User,
    id: string,
    body: UpdateDriverDto,
  ): Promise<Driver> {
    if (Object.keys(body).length === 0) {
      throw new BadRequestException('No changes provided');
    }
    return this.drivers.manager.transaction(async (manager) => {
      const driver = await manager.findOne(Driver, {
        where: { id, companyId: actor.companyId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!driver) throw new NotFoundException('Driver not found');
      Object.assign(driver, body);
      return manager.save(driver);
    });
  }

  async remove(actor: User, id: string): Promise<void> {
    await this.drivers.manager.transaction(async (manager) => {
      const driver = await manager.findOne(Driver, {
        where: { id, companyId: actor.companyId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!driver) throw new NotFoundException('Driver not found');
      await manager
        .createQueryBuilder()
        .update(DriverVehicleAssignment)
        .set({ assignedTo: () => 'clock_timestamp()' })
        .where('"companyId" = :companyId', { companyId: actor.companyId })
        .andWhere('"driverId" = :driverId', { driverId: id })
        .andWhere('"assignedTo" IS NULL')
        .execute();
      await manager.softDelete(Driver, id);
    });
  }

  async assignmentHistory(actor: User, vehicleId: string) {
    await this.vehicles.findVehicleForHistory(
      this.drivers.manager,
      actor,
      vehicleId,
    );
    return this.drivers.manager.find(DriverVehicleAssignment, {
      where: { companyId: actor.companyId, vehicleId },
      order: { assignedFrom: 'DESC', createdAt: 'DESC' },
    });
  }

  async assign(
    actor: User,
    vehicleId: string,
    body: CreateDriverAssignmentDto,
  ): Promise<DriverVehicleAssignment> {
    try {
      return await this.drivers.manager.transaction(async (manager) => {
        await this.vehicles.findAccessibleVehicle(
          manager,
          actor,
          vehicleId,
          true,
        );
        const driver = await manager.findOne(Driver, {
          where: { id: body.driverId, companyId: actor.companyId },
          lock: { mode: 'pessimistic_write' },
        });
        if (!driver) throw new BadRequestException('Invalid driver');
        return manager.save(
          manager.create(DriverVehicleAssignment, {
            companyId: actor.companyId,
            vehicleId,
            driverId: driver.id,
          }),
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
    actor: User,
    vehicleId: string,
    driverId: string,
  ): Promise<void> {
    await this.drivers.manager.transaction(async (manager) => {
      await this.vehicles.findAccessibleVehicle(
        manager,
        actor,
        vehicleId,
        true,
      );
      const assignment = await manager.findOne(DriverVehicleAssignment, {
        where: {
          companyId: actor.companyId,
          vehicleId,
          driverId,
          assignedTo: IsNull(),
        },
        lock: { mode: 'pessimistic_write' },
      });
      if (!assignment) throw new NotFoundException('Assignment not found');
      await manager
        .createQueryBuilder()
        .update(DriverVehicleAssignment)
        .set({ assignedTo: () => 'clock_timestamp()' })
        .where('id = :id', { id: assignment.id })
        .execute();
    });
  }
}
