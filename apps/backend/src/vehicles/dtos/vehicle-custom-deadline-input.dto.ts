import { ApiProperty } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayUnique,
  IsArray,
  IsDateString,
  IsOptional,
  IsUUID,
  Matches,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { applyDecorators } from '@nestjs/common';
import { MAX_CUSTOM_VEHICLE_DEADLINE_KINDS } from '../../vehicle-deadline-kinds/vehicle-deadline-kind-catalog';
import { vehicleTransforms } from './vehicle-transforms';

export class VehicleCustomDeadlineInputDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  kindId!: string;

  @ApiProperty({
    type: String,
    format: 'date',
    nullable: true,
    description: 'null removes the date from this Vehicle.',
  })
  @Transform(vehicleTransforms.optionalText)
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  @IsDateString({ strict: true, strictSeparator: true })
  date?: string | null;
}

export function CustomDeadlinesField() {
  return applyDecorators(
    ApiProperty({
      type: VehicleCustomDeadlineInputDto,
      isArray: true,
      required: false,
      description:
        'Listed kinds are set or removed; other kinds stay as they are.',
    }),
    ValidateIf((_object, value) => value !== undefined),
    IsArray(),
    ArrayMaxSize(MAX_CUSTOM_VEHICLE_DEADLINE_KINDS),
    ArrayUnique((entry?: { kindId?: string }) => entry?.kindId),
    ValidateNested({ each: true }),
    Type(() => VehicleCustomDeadlineInputDto),
  );
}
