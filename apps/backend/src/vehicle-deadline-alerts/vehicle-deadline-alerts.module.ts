import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VehicleDeadlineAlertPolicy } from '../alert-policy/vehicle-deadline-alert-policy.entity';
import { FleetModule } from '../fleet/fleet.module';
import { UsersModule } from '../users/users.module';
import { VehicleDeadlineAlertsController } from './vehicle-deadline-alerts.controller';
import { VehicleDeadlineAlertsService } from './vehicle-deadline-alerts.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([VehicleDeadlineAlertPolicy]),
    FleetModule,
    UsersModule,
  ],
  controllers: [VehicleDeadlineAlertsController],
  providers: [VehicleDeadlineAlertsService],
})
export class VehicleDeadlineAlertsModule {}
