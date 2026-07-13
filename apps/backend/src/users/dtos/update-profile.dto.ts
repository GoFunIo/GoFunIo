import { Transform } from 'class-transformer';
import { IsOptional, IsString, Matches, MaxLength } from 'class-validator';

const optionalText = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() || null : value;

export class UpdateProfileDto {
  @Transform(optionalText)
  @IsOptional()
  @IsString()
  @MaxLength(100)
  firstName?: string | null;

  @Transform(optionalText)
  @IsOptional()
  @IsString()
  @MaxLength(100)
  lastName?: string | null;

  @Transform(optionalText)
  @IsOptional()
  @IsString()
  @MaxLength(32)
  phone?: string | null;

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
