import { Module } from '@nestjs/common';
import { FLEET_UNIT_OF_WORK } from './fleet-unit-of-work';
import { TypeOrmFleetUnitOfWork } from './typeorm-fleet-unit-of-work';
import { TypeOrmVehicleAccess } from './typeorm-vehicle-access';
import { VEHICLE_ACCESS } from './vehicle-access';
import { DRIVER_ALLOCATION } from './driver-allocation';
import { TypeOrmDriverAllocation } from './typeorm-driver-allocation';

@Module({
  providers: [
    TypeOrmVehicleAccess,
    TypeOrmDriverAllocation,
    {
      provide: DRIVER_ALLOCATION,
      useExisting: TypeOrmDriverAllocation,
    },
    {
      provide: VEHICLE_ACCESS,
      useExisting: TypeOrmVehicleAccess,
    },
    TypeOrmFleetUnitOfWork,
    {
      provide: FLEET_UNIT_OF_WORK,
      useExisting: TypeOrmFleetUnitOfWork,
    },
  ],
  exports: [DRIVER_ALLOCATION, FLEET_UNIT_OF_WORK, VEHICLE_ACCESS],
})
export class FleetModule {}
