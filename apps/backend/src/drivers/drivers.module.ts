import { Module } from '@nestjs/common';
import { AllowedOriginGuard } from '../common/allowed-origin.guard';
import { FleetModule } from '../fleet/fleet.module';
import { UsersModule } from '../users/users.module';
import { DriverAssignmentsController } from './driver-assignments.controller';
import { DriversController } from './drivers.controller';
import { DriversService } from './drivers.service';

@Module({
  imports: [UsersModule, FleetModule],
  controllers: [DriversController, DriverAssignmentsController],
  providers: [DriversService, AllowedOriginGuard],
})
export class DriversModule {}
