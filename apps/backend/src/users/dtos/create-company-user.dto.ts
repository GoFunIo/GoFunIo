import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { lowercaseEmail, optionalText } from '../../common/dto-transforms';
import { MembershipRole } from '../membership-role';

export class CreateCompanyUserDto {
  @Transform(lowercaseEmail)
  @IsEmail()
  @MaxLength(254)
  email!: string;

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

  @IsIn([MembershipRole.ADMIN, MembershipRole.MANAGER])
  role!: MembershipRole;
}
