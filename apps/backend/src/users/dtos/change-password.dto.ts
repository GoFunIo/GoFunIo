import { IsString, MaxLength, MinLength } from 'class-validator';
import { IsNewPassword } from '../password-policy';

export class ChangePasswordDto {
  @IsString()
  @MinLength(1)
  @MaxLength(128)
  currentPassword!: string;

  @IsString()
  @IsNewPassword()
  newPassword!: string;
}
