import { Transform } from 'class-transformer';
import {
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  ValidateIf,
} from 'class-validator';
import { MembershipRole } from '../membership-role';

const optionalText = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() || null : value;

export class UpdateCompanyUserDto {
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

  @ValidateIf((_, value) => value !== undefined)
  @IsEnum(MembershipRole)
  role?: MembershipRole;
}
