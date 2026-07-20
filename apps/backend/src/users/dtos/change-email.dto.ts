import { Transform } from 'class-transformer';
import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';
import { lowercaseEmail } from '../../common/dto-transforms';

export class ChangeEmailDto {
  @Transform(lowercaseEmail)
  @IsEmail()
  @MaxLength(254)
  email!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(128)
  currentPassword!: string;
}
