import { ApiPropertyOptional } from '@nestjs/swagger';
import { ValidateBy } from 'class-validator';
import {
  ArrayMaxSize,
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsEnum,
  IsInt,
  IsString,
  Max,
  Min,
  ValidateIf,
} from 'class-validator';
import { isIanaTimeZone } from '../../common/workspace-calendar';
import { VehicleDeadlineKind } from '../vehicle-deadline-alert-policy.entity';

export class UpdateVehicleDeadlineAlertPolicyDto {
  @ApiPropertyOptional({
    enum: VehicleDeadlineKind,
    isArray: true,
    uniqueItems: true,
    maxItems: 3,
    example: ['OC', 'AC', 'TECHNICAL_INSPECTION'],
  })
  @ValidateIf((_object, value) => value !== undefined)
  @IsArray()
  @ArrayMaxSize(3)
  @ArrayUnique()
  @IsEnum(VehicleDeadlineKind, { each: true })
  enabledDeadlineKinds?: VehicleDeadlineKind[];

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
