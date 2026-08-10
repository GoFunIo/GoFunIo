import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AllowedOriginGuard } from '../common/allowed-origin.guard';
import { FleetModule } from '../fleet/fleet.module';
import { UsersModule } from '../users/users.module';
import { Vehicle } from './vehicles.entity';
import { VehiclesController } from './vehicles.controller';
import { VehiclesService } from './vehicles.service';

@Module({
  imports: [TypeOrmModule.forFeature([Vehicle]), UsersModule, FleetModule],
  controllers: [VehiclesController],
  providers: [VehiclesService, AllowedOriginGuard],
  exports: [VehiclesService],
})
export class VehiclesModule {}
