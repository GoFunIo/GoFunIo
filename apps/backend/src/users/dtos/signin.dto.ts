import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';
import { Transform } from 'class-transformer';
import { lowercaseEmail } from '../../common/dto-transforms';

export class SigninDto {
  @Transform(lowercaseEmail)
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(128)
  password!: string;
}
