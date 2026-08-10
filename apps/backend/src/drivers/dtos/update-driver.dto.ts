import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  ValidateIf,
} from 'class-validator';
import { vehicleTransforms } from '../../vehicles/dtos/vehicle-transforms';

const email = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim().toLowerCase() || null : value;

export class UpdateDriverDto {
  @Transform(vehicleTransforms.trim)
  @ValidateIf((_, value) => value !== undefined)
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  firstName?: string;

  @Transform(vehicleTransforms.trim)
  @ValidateIf((_, value) => value !== undefined)
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  lastName?: string;

  @Transform(email)
  @IsOptional()
  @IsEmail()
  @MaxLength(254)
  email?: string | null;

  @Transform(vehicleTransforms.optionalText)
  @IsOptional()
  @IsString()
  @MaxLength(50)
  phone?: string | null;

  @Transform(vehicleTransforms.optionalText)
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  notes?: string | null;

  @ValidateIf((_, value) => value !== undefined && value !== null)
  @IsUUID()
  userId?: string | null;
}
