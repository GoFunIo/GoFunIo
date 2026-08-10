import { Module } from '@nestjs/common';
import { FleetModule } from '../fleet/fleet.module';
import { UsersModule } from '../users/users.module';
import { VehiclesController } from './vehicles.controller';
import { VehiclesService } from './vehicles.service';

@Module({
  imports: [UsersModule, FleetModule],
  controllers: [VehiclesController],
  providers: [VehiclesService],
})
export class VehiclesModule {}
