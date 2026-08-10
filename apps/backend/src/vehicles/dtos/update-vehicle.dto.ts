import { Transform } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';
import { VehicleFuelType } from '../vehicles.entity';
import { vehicleTransforms } from './vehicle-transforms';

export class UpdateVehicleDto {
  @Transform(vehicleTransforms.trim)
  @ValidateIf((_, value) => value !== undefined)
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  brand?: string;

  @Transform(vehicleTransforms.trim)
  @ValidateIf((_, value) => value !== undefined)
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  model?: string;

  @Transform(vehicleTransforms.number)
  @IsOptional()
  @IsInt()
  @Min(1886)
  productionYear?: number | null;

  @IsOptional()
  @IsEnum(VehicleFuelType)
  fuelType?: VehicleFuelType | null;

  @Transform(vehicleTransforms.vin)
  @IsOptional()
  @Matches(/^[A-HJ-NPR-Z0-9]{17}$/)
  vin?: string | null;

  @Transform(vehicleTransforms.registration)
  @ValidateIf((_, value) => value !== undefined)
  @IsString()
  @Matches(/^[A-Z0-9]{4,10}$/)
  registrationNumber?: string;

  @Transform(vehicleTransforms.number)
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(2_147_483_647)
  currentMileage?: number | null;

  @Transform(vehicleTransforms.optionalText)
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  @IsDateString({ strict: true, strictSeparator: true })
  purchaseDate?: string | null;

  @Transform(vehicleTransforms.optionalText)
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  @IsDateString({ strict: true, strictSeparator: true })
  ocExpiry?: string | null;

  @Transform(vehicleTransforms.optionalText)
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  @IsDateString({ strict: true, strictSeparator: true })
  acExpiry?: string | null;

  @Transform(vehicleTransforms.optionalText)
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  @IsDateString({ strict: true, strictSeparator: true })
  technicalInspectionExpiry?: string | null;

  @Transform(vehicleTransforms.optionalText)
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  notes?: string | null;
}
