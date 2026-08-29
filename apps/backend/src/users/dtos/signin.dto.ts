import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';
import { Transform } from 'class-transformer';
import { lowercaseEmail } from '../../common/dto-transforms';
import { ApiProperty } from '@nestjs/swagger';

export class SigninDto {
  @ApiProperty({ example: 'tester@example.com' })
  @Transform(lowercaseEmail)
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'CorrectHorseBattery1' })
  @IsString()
  @MinLength(1)
  @MaxLength(128)
  password!: string;
}
