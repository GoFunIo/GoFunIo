import { ApiProperty } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';
import { VehicleDeadlineKind } from '../../alert-policy/vehicle-deadline-alert-policy.entity';
import { NotificationCategory } from '../../notification-preferences/notification-preference.entity';
import { NotificationType } from '../notification.entity';

export class NotificationActionDto {
  @ApiProperty({ example: 'OPEN_VEHICLE' }) @Expose() type!: 'OPEN_VEHICLE';
  @ApiProperty({ format: 'uuid' }) @Expose() vehicleId!: string;
}

export class VehicleDeadlineNotificationDto {
  @ApiProperty({ format: 'uuid' }) @Expose() id!: string;
  @ApiProperty({ enum: NotificationType }) @Expose() type!: NotificationType;
  @ApiProperty({ enum: NotificationCategory })
  @Expose()
  category!: NotificationCategory;
  @ApiProperty({ example: 1 }) @Expose() rendererVersion!: number;
  @ApiProperty({ format: 'date-time' }) @Expose() createdAt!: Date;
  @ApiProperty({ format: 'uuid' }) @Expose() vehicleId!: string;
  @ApiProperty({ enum: VehicleDeadlineKind })
  @Expose()
  deadlineKind!: VehicleDeadlineKind;
  @ApiProperty({ format: 'date' }) @Expose() deadlineDate!: string;
  @ApiProperty({ example: 7 }) @Expose() leadDay!: number;
  @ApiProperty({ example: 'WA12345' }) @Expose() registrationNumber!: string;
  @ApiProperty({ type: NotificationActionDto })
  @Expose()
  @Type(() => NotificationActionDto)
  action!: NotificationActionDto;
}

export class NotificationListDto {
  @ApiProperty({ type: VehicleDeadlineNotificationDto, isArray: true })
  @Expose()
  @Type(() => VehicleDeadlineNotificationDto)
  items!: VehicleDeadlineNotificationDto[];
}
