import { IsEmail } from 'class-validator';
import { Transform } from 'class-transformer';
import { lowercaseEmail } from '../../common/dto-transforms';

export class ResendVerificationDto {
  @Transform(lowercaseEmail)
  @IsEmail()
  email!: string;
}
