import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, EntityManager, In } from 'typeorm';
import { Driver } from '../drivers/drivers.entity';
import { Vehicle } from '../vehicles/vehicles.entity';
import {
  type FleetTransaction,
  type FleetUnitOfWork,
  type FleetVehicle,
  type FleetVehicleInput,
} from './fleet-unit-of-work';
import { TypeOrmVehicleAccess } from './typeorm-vehicle-access';
import { TypeOrmDriverAllocation } from './typeorm-driver-allocation';

@Injectable()
export class TypeOrmFleetUnitOfWork implements FleetUnitOfWork {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly vehicleAccess: TypeOrmVehicleAccess,
    private readonly driverAllocation: TypeOrmDriverAllocation,
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
        create: (input) => manager.save(manager.create(Driver, input)),
        update: async (driverId, fields) => {
          await manager.update(Driver, driverId, fields);
          const driver = await manager.findOneBy(Driver, { id: driverId });
          if (!driver) throw new NotFoundException('Driver not found');
          return driver;
        },
        softDelete: async (driverId) => {
          await manager.softDelete(Driver, driverId);
        },
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
      driverAllocations: this.driverAllocation.transactionStore(manager),
    };
  }
}
