import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersModule } from '../users/users.module';
import { AlertPolicyController } from './alert-policy.controller';
import { AlertPolicyService } from './alert-policy.service';
import { VehicleDeadlineAlertPolicy } from './vehicle-deadline-alert-policy.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([VehicleDeadlineAlertPolicy]),
    UsersModule,
  ],
  controllers: [AlertPolicyController],
  providers: [AlertPolicyService],
})
export class AlertPolicyModule {}
