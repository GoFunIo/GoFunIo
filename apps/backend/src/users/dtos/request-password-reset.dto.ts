import { IsEmail } from 'class-validator';
import { Transform } from 'class-transformer';
import { lowercaseEmail } from '../../common/dto-transforms';

export class RequestPasswordResetDto {
  @Transform(lowercaseEmail)
  @IsEmail()
  email!: string;
}
