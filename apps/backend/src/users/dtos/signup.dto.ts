import { IsEmail, IsString } from 'class-validator';
import { Transform } from 'class-transformer';
import { lowercaseEmail } from '../../common/dto-transforms';
import { IsNewPassword } from '../password-policy';
import { ApiProperty } from '@nestjs/swagger';

export class SignupDto {
  @ApiProperty({ example: 'tester@example.com' })
  @Transform(lowercaseEmail)
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'CorrectHorseBattery1!' })
  @IsString()
  @IsNewPassword()
  password!: string;
}
