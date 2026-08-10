import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, EntityManager, In, IsNull } from 'typeorm';
import { DriverVehicleAssignment } from '../drivers/driver-vehicle-assignment.entity';
import { Driver } from '../drivers/drivers.entity';
import { Vehicle } from '../vehicles/vehicles.entity';
import {
  type FleetTransaction,
  type FleetUnitOfWork,
  type FleetVehicle,
  type FleetVehicleInput,
} from './fleet-unit-of-work';
import { TypeOrmVehicleAccess } from './typeorm-vehicle-access';

@Injectable()
export class TypeOrmFleetUnitOfWork implements FleetUnitOfWork {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly vehicleAccess: TypeOrmVehicleAccess,
  ) {}

  transact<T>(work: (fleet: FleetTransaction) => Promise<T>): Promise<T> {
    return this.dataSource.transaction((manager) =>
      work(this.transactionStores(manager)),
    );
  }

  private transactionStores(manager: EntityManager): FleetTransaction {
    return {
      vehicles: {
        create: async (input: FleetVehicleInput): Promise<FleetVehicle> => {
          const vehicle = await manager.save(manager.create(Vehicle, input));
          return {
            id: vehicle.id,
            companyId: vehicle.companyId,
            brand: vehicle.brand,
            model: vehicle.model,
            productionYear: vehicle.productionYear,
            fuelType: vehicle.fuelType,
            vin: vehicle.vin,
            registrationNumber: vehicle.registrationNumber,
            currentMileage: vehicle.currentMileage,
            purchaseDate: vehicle.purchaseDate,
            ocExpiry: vehicle.ocExpiry,
            acExpiry: vehicle.acExpiry,
            technicalInspectionExpiry: vehicle.technicalInspectionExpiry,
            notes: vehicle.notes,
            createdAt: vehicle.createdAt,
            updatedAt: vehicle.updatedAt,
            deletedAt: vehicle.deletedAt,
          };
        },
        update: async (vehicleId, fields) => {
          await manager.update(Vehicle, vehicleId, fields);
          const vehicle = await manager.findOneBy(Vehicle, { id: vehicleId });
          if (!vehicle) throw new NotFoundException('Vehicle not found');
          return vehicle;
        },
        softDelete: async (vehicleId) => {
          await manager.softDelete(Vehicle, vehicleId);
        },
      },
      vehicleAccess: this.vehicleAccess.transactionStore(manager),
      drivers: {
        requireAll: async (companyId, driverIds) => {
          if (!driverIds.length) return;
          const drivers = await manager.find(Driver, {
            where: { id: In(driverIds), companyId },
            lock: { mode: 'pessimistic_write' },
          });
          if (drivers.length !== driverIds.length) {
            throw new BadRequestException('Invalid driver');
          }
        },
        requireOne: async (companyId, driverId) => {
          const driver = await manager.findOne(Driver, {
            where: { id: driverId, companyId },
            lock: { mode: 'pessimistic_write' },
          });
          if (!driver) throw new BadRequestException('Invalid driver');
        },
      },
      driverAllocations: {
        assign: async (companyId, vehicleId, driverId) =>
          manager.save(
            manager.create(DriverVehicleAssignment, {
              companyId,
              vehicleId,
              driverId,
            }),
          ),
        assignInitial: async (companyId, vehicleId, driverIds) => {
          if (!driverIds.length) return;
          await manager.save(
            driverIds.map((driverId) =>
              manager.create(DriverVehicleAssignment, {
                companyId,
                vehicleId,
                driverId,
              }),
            ),
          );
        },
        unassign: async (companyId, vehicleId, driverId) => {
          const assignment = await manager.findOne(DriverVehicleAssignment, {
            where: {
              companyId,
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
        },
        history: (companyId, vehicleId) =>
          manager.find(DriverVehicleAssignment, {
            where: { companyId, vehicleId },
            order: { assignedFrom: 'DESC', createdAt: 'DESC' },
          }),
        activeDriverIds: async (companyId, vehicleIds) => {
          const result = new Map(
            vehicleIds.map((vehicleId) => [vehicleId, [] as string[]]),
          );
          if (!vehicleIds.length) return result;
          const assignments = await manager.find(DriverVehicleAssignment, {
            select: { vehicleId: true, driverId: true },
            where: {
              companyId,
              vehicleId: In(vehicleIds),
              assignedTo: IsNull(),
            },
          });
          for (const { vehicleId, driverId } of assignments) {
            result.get(vehicleId)?.push(driverId);
          }
          return result;
        },
        closeVehicle: async (companyId, vehicleId) => {
          await manager
            .createQueryBuilder()
            .update(DriverVehicleAssignment)
            .set({ assignedTo: () => 'clock_timestamp()' })
            .where('"companyId" = :companyId', { companyId })
            .andWhere('"vehicleId" = :vehicleId', { vehicleId })
            .andWhere('"assignedTo" IS NULL')
            .execute();
        },
      },
    };
  }
}
