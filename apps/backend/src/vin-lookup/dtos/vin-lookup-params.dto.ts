import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { Matches } from 'class-validator';
import {
  VIN_PATTERN,
  vehicleTransforms,
} from '../../vehicles/dtos/vehicle-transforms';

export class VinLookupParamsDto {
  @ApiProperty({ example: '1HGCM82633A004352' })
  @Transform(vehicleTransforms.vin)
  @Matches(VIN_PATTERN)
  vin!: string;
}
