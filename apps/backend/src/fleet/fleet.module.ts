import { Module } from '@nestjs/common';
import { FLEET_UNIT_OF_WORK } from './fleet-unit-of-work';
import { TypeOrmFleetUnitOfWork } from './typeorm-fleet-unit-of-work';
import { TypeOrmVehicleAccess } from './typeorm-vehicle-access';
import { VEHICLE_ACCESS } from './vehicle-access';

@Module({
  providers: [
    TypeOrmVehicleAccess,
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
  exports: [FLEET_UNIT_OF_WORK, VEHICLE_ACCESS],
})
export class FleetModule {}
