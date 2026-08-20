import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FleetModule } from '../fleet/fleet.module';
import { ServiceAttachmentsModule } from '../service-attachments/service-attachments.module';
import { UsersModule } from '../users/users.module';
import { Service } from './services.entity';
import { ServicesController } from './services.controller';
import { ServicesService } from './services.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Service]),
    UsersModule,
    FleetModule,
    ServiceAttachmentsModule,
  ],
  controllers: [ServicesController],
  providers: [ServicesService],
})
export class ServicesModule {}
