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
} from 'class-validator';
import { optionalText } from '../../common/dto-transforms';
import { ServiceType } from '../services.entity';
import { ApiProperty } from '@nestjs/swagger';

const number = ({ value }: { value: unknown }) =>
  typeof value === 'string' && value.trim() ? Number(value) : value;

export class CreateServiceDto {
  @ApiProperty({
    format: 'uuid',
    example: '7fd77abe-6a77-4cb7-9f7a-cf0b542643f5',
  })
  @IsUUID()
  vehicleId!: string;

  @ApiProperty({ format: 'date', example: '2026-08-20' })
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  @IsDateString({ strict: true, strictSeparator: true })
  serviceDate!: string;

  @ApiProperty({ enum: ServiceType })
  @IsEnum(ServiceType)
  type!: ServiceType;

  @ApiProperty({ example: 399.99, minimum: 0.01 })
  @Transform(number)
  @IsNumber({ allowInfinity: false, allowNaN: false, maxDecimalPlaces: 2 })
  @Min(0.01)
  @Max(9_999_999_999.99)
  cost!: number;

  @ApiProperty({ example: 'Auto Serwis Warszawa' })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  providerName!: string;

  @Transform(optionalText)
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  notes?: string | null;
}
