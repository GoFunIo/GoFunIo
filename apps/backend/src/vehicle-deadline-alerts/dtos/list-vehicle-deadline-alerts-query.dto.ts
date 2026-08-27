import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { VehicleDeadlineKind } from '../../alert-policy/vehicle-deadline-alert-policy.entity';

export class ListVehicleDeadlineAlertsQueryDto {
  @ApiPropertyOptional({
    enum: VehicleDeadlineKind,
    description: 'Return only this enabled Vehicle deadline kind.',
  })
  @IsOptional()
  @IsEnum(VehicleDeadlineKind)
  deadlineKind?: VehicleDeadlineKind;

  @ApiPropertyOptional({
    format: 'uuid',
    description:
      'Return Alerts for this Vehicle when it is visible in the Active Workspace.',
  })
  @IsOptional()
  @IsUUID()
  vehicleId?: string;

  @ApiPropertyOptional({
    type: Boolean,
    description:
      'When true, return dates before Workspace-local today; when false, return due or upcoming Alerts.',
  })
  @Transform(({ value }: { value: unknown }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  @IsOptional()
  @IsBoolean()
  overdue?: boolean;

  @ApiPropertyOptional({
    minimum: 1,
    maximum: 100,
    default: 20,
    description: 'Page size. Defaults to 20 and cannot exceed 100.',
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 20;

  @ApiPropertyOptional({
    description:
      'Opaque cursor returned by the previous page. Reuse it only in the same Active Workspace with identical filters; it follows deadline date, Vehicle id, and kind order.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(2048)
  cursor?: string;
}
