import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

const optionalText = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() || null : value;

export class UpdateCompanyDto {
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  name?: string;

  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() || null : value,
  )
  @IsOptional()
  @IsEmail()
  @MaxLength(254)
  email?: string | null;

  @Transform(optionalText)
  @IsOptional()
  @IsString()
  @MaxLength(32)
  phone?: string | null;

  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.replace(/[\s-]/g, '') || null : value,
  )
  @IsOptional()
  @Matches(/^\d{10}$/)
  taxId?: string | null;

  @Transform(optionalText)
  @IsOptional()
  @IsString()
  @MaxLength(255)
  address?: string | null;

  @Transform(optionalText)
  @IsOptional()
  @Matches(/^\d{2}-\d{3}$/)
  postalCode?: string | null;

  @Transform(optionalText)
  @IsOptional()
  @IsString()
  @MaxLength(100)
  city?: string | null;
}
