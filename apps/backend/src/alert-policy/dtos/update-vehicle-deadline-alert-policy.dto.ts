import { ApiPropertyOptional } from '@nestjs/swagger';
import { ValidateBy } from 'class-validator';
import {
  ArrayMaxSize,
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsInt,
  IsString,
  Max,
  Min,
  ValidateIf,
} from 'class-validator';
import { isIanaTimeZone } from '../../common/workspace-calendar';
import {
  IsVehicleDeadlineKindKey,
  MAX_VEHICLE_DEADLINE_KINDS,
} from '../../vehicle-deadline-kinds/vehicle-deadline-kind-catalog';

export class UpdateVehicleDeadlineAlertPolicyDto {
  @ApiPropertyOptional({
    type: String,
    isArray: true,
    uniqueItems: true,
    maxItems: MAX_VEHICLE_DEADLINE_KINDS,
    example: ['OC', 'AC', 'TECHNICAL_INSPECTION'],
    description: 'Built-in kinds or custom kind ids of this Workspace.',
  })
  @ValidateIf((_object, value) => value !== undefined)
  @IsArray()
  @ArrayMaxSize(MAX_VEHICLE_DEADLINE_KINDS)
  @ArrayUnique()
  @IsVehicleDeadlineKindKey({ each: true })
  enabledDeadlineKinds?: string[];

  @ApiPropertyOptional({
    type: 'array',
    items: { type: 'integer', minimum: 0, maximum: 365 },
    minItems: 1,
    maxItems: 10,
    uniqueItems: true,
    example: [30, 14, 7, 0],
    description: 'Distinct integer lead days; stored and returned decreasing.',
  })
  @ValidateIf((_object, value) => value !== undefined)
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(10)
  @ArrayUnique()
  @IsInt({ each: true })
  @Min(0, { each: true })
  @Max(365, { each: true })
  leadDays?: number[];

  @ApiPropertyOptional({
    example: 'Europe/Warsaw',
    description: 'Valid IANA time-zone identifier.',
  })
  @ValidateIf((_object, value) => value !== undefined)
  @IsString()
  @ValidateBy({
    name: 'isIanaTimeZone',
    validator: {
      validate: (value) => typeof value === 'string' && isIanaTimeZone(value),
      defaultMessage: () => 'timeZone must be a valid IANA time zone',
    },
  })
  timeZone?: string;
}
