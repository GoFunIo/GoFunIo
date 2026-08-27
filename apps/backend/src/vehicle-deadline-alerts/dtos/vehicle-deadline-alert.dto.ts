import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';
import { VehicleDeadlineKind } from '../../alert-policy/vehicle-deadline-alert-policy.entity';

export class VehicleDeadlineAlertVehicleDto {
  @ApiProperty()
  @Expose()
  brand!: string;

  @ApiProperty()
  @Expose()
  model!: string;

  @ApiProperty()
  @Expose()
  registrationNumber!: string;
}

export class VehicleDeadlineAlertDto {
  @ApiProperty({ description: 'Stable opaque identity of this projection.' })
  @Expose()
  alertKey!: string;

  @ApiProperty({ format: 'uuid' })
  @Expose()
  vehicleId!: string;

  @ApiProperty({ type: VehicleDeadlineAlertVehicleDto })
  @Expose()
  @Type(() => VehicleDeadlineAlertVehicleDto)
  vehicle!: VehicleDeadlineAlertVehicleDto;

  @ApiProperty({ enum: VehicleDeadlineKind })
  @Expose()
  deadlineKind!: VehicleDeadlineKind;

  @ApiProperty({ type: String, format: 'date' })
  @Expose()
  deadlineDate!: string;

  @ApiProperty({ type: Number, description: 'Workspace calendar days.' })
  @Expose()
  daysRemaining!: number;

  @ApiProperty()
  @Expose()
  overdue!: boolean;
}

export class VehicleDeadlineAlertListDto {
  @ApiProperty({ type: VehicleDeadlineAlertDto, isArray: true })
  @Expose()
  @Type(() => VehicleDeadlineAlertDto)
  items!: VehicleDeadlineAlertDto[];

  @ApiPropertyOptional({
    type: String,
    nullable: true,
    description:
      'Opaque stable cursor for the next page; valid only in the same Active Workspace with identical filters.',
  })
  @Expose()
  nextCursor!: string | null;
}

export class NotificationCenterSummaryDto {
  @ApiProperty({
    minimum: 0,
    description:
      'All active Alerts under the current policy, Workspace-local date, and Vehicle visibility rules.',
  })
  @Expose()
  activeAlertCount!: number;

  @ApiProperty({
    minimum: 0,
    default: 0,
    description:
      'Unread durable Notifications. Always zero until Notifications are implemented.',
  })
  @Expose()
  unreadNotificationCount!: number;
}
