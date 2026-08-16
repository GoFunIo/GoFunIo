import { Transform } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';
import { optionalText } from '../../common/dto-transforms';
import { ServiceType } from '../services.entity';

export class UpdateServiceDto {
  @ValidateIf((_, value) => value !== undefined)
  @IsUUID()
  vehicleId?: string;

  @ValidateIf((_, value) => value !== undefined)
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  @IsDateString({ strict: true, strictSeparator: true })
  serviceDate?: string;

  @ValidateIf((_, value) => value !== undefined)
  @IsEnum(ServiceType)
  type?: ServiceType;

  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' && value.trim() ? Number(value) : value,
  )
  @ValidateIf((_, value) => value !== undefined)
  @IsNumber({ allowInfinity: false, allowNaN: false, maxDecimalPlaces: 2 })
  @Min(0.01)
  @Max(9_999_999_999.99)
  cost?: number;

  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @ValidateIf((_, value) => value !== undefined)
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  providerName?: string;

  @Transform(optionalText)
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  notes?: string | null;
}
