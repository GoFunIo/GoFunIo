import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsEnum,
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

  @IsEnum(MembershipRole)
  role!: MembershipRole;
}
