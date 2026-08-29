import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersModule } from '../users/users.module';
import { NotificationPreference } from './notification-preference.entity';
import { NotificationPreferencesController } from './notification-preferences.controller';
import { NotificationPreferencesService } from './notification-preferences.service';

@Module({
  imports: [TypeOrmModule.forFeature([NotificationPreference]), UsersModule],
  controllers: [NotificationPreferencesController],
  providers: [NotificationPreferencesService],
})
export class NotificationPreferencesModule {}
