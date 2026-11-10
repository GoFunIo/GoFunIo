import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { IsVehicleDeadlineKindKey } from '../../vehicle-deadline-kinds/vehicle-deadline-kind-catalog';

export class ListVehicleDeadlineAlertsQueryDto {
  @ApiPropertyOptional({
    example: 'OC',
    description:
      'Return only this enabled Vehicle deadline kind: a built-in kind or a custom kind id.',
  })
  @IsOptional()
  @IsVehicleDeadlineKindKey()
  deadlineKind?: string;

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
