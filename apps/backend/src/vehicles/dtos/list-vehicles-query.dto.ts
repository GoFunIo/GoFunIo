import { Transform, Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export enum VehicleSortBy {
  CREATED_AT = 'createdAt',
  BRAND = 'brand',
  MODEL = 'model',
  PRODUCTION_YEAR = 'productionYear',
  CURRENT_MILEAGE = 'currentMileage',
  OC_EXPIRY = 'ocExpiry',
  AC_EXPIRY = 'acExpiry',
  INSPECTION_EXPIRY = 'technicalInspectionExpiry',
}

export enum SortOrder {
  ASC = 'asc',
  DESC = 'desc',
}

export enum VehicleExpiryType {
  OC = 'oc',
  AC = 'ac',
  INSPECTION = 'inspection',
}

export class ListVehiclesQueryDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(10_000)
  page = 1;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize = 20;

  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() || undefined : value,
  )
  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;

  @IsEnum(VehicleSortBy)
  sortBy = VehicleSortBy.CREATED_AT;

  @IsEnum(SortOrder)
  sortOrder = SortOrder.DESC;

  @IsOptional()
  @IsEnum(VehicleExpiryType)
  expiryType?: VehicleExpiryType;

  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(365)
  expiresWithinDays?: number;
}
