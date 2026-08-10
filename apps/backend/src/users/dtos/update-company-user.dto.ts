import { Transform } from 'class-transformer';
import {
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  ValidateIf,
} from 'class-validator';
import { optionalText } from '../../common/dto-transforms';
import { MembershipRole } from '../membership-role';

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
  @IsIn([MembershipRole.ADMIN, MembershipRole.MANAGER])
  role?: MembershipRole;
}
