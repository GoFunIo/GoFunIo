import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';
import { Transform } from 'class-transformer';
import { lowercaseEmail } from '../../common/dto-transforms';

export class SignupDto {
  @Transform(lowercaseEmail)
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password!: string;
}
