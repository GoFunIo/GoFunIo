import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersModule } from '../users/users.module';
import { VehicleDeadlineCustomDate } from './vehicle-deadline-custom-date.entity';
import { VehicleDeadlineCustomKind } from './vehicle-deadline-custom-kind.entity';
import { VehicleDeadlineKindsController } from './vehicle-deadline-kinds.controller';
import { VehicleDeadlineKindsService } from './vehicle-deadline-kinds.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      VehicleDeadlineCustomKind,
      VehicleDeadlineCustomDate,
    ]),
    UsersModule,
  ],
  controllers: [VehicleDeadlineKindsController],
  providers: [VehicleDeadlineKindsService],
})
export class VehicleDeadlineKindsModule {}
