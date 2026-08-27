import { Module } from '@nestjs/common';
import { FLEET_UNIT_OF_WORK } from './fleet-unit-of-work';
import { TypeOrmFleetUnitOfWork } from './typeorm-fleet-unit-of-work';
import { TypeOrmVehicleAccess } from './typeorm-vehicle-access';
import { VEHICLE_ACCESS } from './vehicle-access';
import { DRIVER_ALLOCATION } from './driver-allocation';
import { TypeOrmDriverAllocation } from './typeorm-driver-allocation';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Vehicle } from '../vehicles/vehicles.entity';
import { ManagerVehicleAssignment } from '../vehicles/manager-vehicle-assignment.entity';
import { Driver } from '../drivers/drivers.entity';
import { DriverVehicleAssignment } from '../drivers/driver-vehicle-assignment.entity';
import { TRANSACTIONAL_VEHICLE_ACCESS } from './transactional-vehicle-access';
import { VehicleDeadlineNotificationWriter } from '../notifications/vehicle-deadline-notification-writer';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Vehicle,
      ManagerVehicleAssignment,
      Driver,
      DriverVehicleAssignment,
    ]),
  ],
  providers: [
    TypeOrmVehicleAccess,
    VehicleDeadlineNotificationWriter,
    TypeOrmDriverAllocation,
    {
      provide: DRIVER_ALLOCATION,
      useExisting: TypeOrmDriverAllocation,
    },
    {
      provide: VEHICLE_ACCESS,
      useExisting: TypeOrmVehicleAccess,
    },
    {
      provide: TRANSACTIONAL_VEHICLE_ACCESS,
      useExisting: TypeOrmVehicleAccess,
    },
    TypeOrmFleetUnitOfWork,
    {
      provide: FLEET_UNIT_OF_WORK,
      useExisting: TypeOrmFleetUnitOfWork,
    },
  ],
  exports: [
    DRIVER_ALLOCATION,
    FLEET_UNIT_OF_WORK,
    TRANSACTIONAL_VEHICLE_ACCESS,
    VEHICLE_ACCESS,
  ],
})
export class FleetModule {}
