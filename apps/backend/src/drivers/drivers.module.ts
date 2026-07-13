import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AllowedOriginGuard } from '../common/allowed-origin.guard';
import { UsersModule } from '../users/users.module';
import { VehiclesModule } from '../vehicles/vehicles.module';
import { DriverAssignmentsController } from './driver-assignments.controller';
import { Driver } from './drivers.entity';
import { DriversController } from './drivers.controller';
import { DriversService } from './drivers.service';

@Module({
  imports: [TypeOrmModule.forFeature([Driver]), UsersModule, VehiclesModule],
  controllers: [DriversController, DriverAssignmentsController],
  providers: [DriversService, AllowedOriginGuard],
})
export class DriversModule {}
