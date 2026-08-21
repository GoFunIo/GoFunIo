import { ConflictException, HttpStatus } from '@nestjs/common';
import { ApiProperty } from '@nestjs/swagger';

export enum ConflictCode {
  VEHICLE_REGISTRATION_IN_USE = 'VEHICLE_REGISTRATION_IN_USE',
  VEHICLE_VIN_IN_USE = 'VEHICLE_VIN_IN_USE',
  EMAIL_IN_USE = 'EMAIL_IN_USE',
  CANNOT_DEMOTE_SELF = 'CANNOT_DEMOTE_SELF',
  CANNOT_DELETE_SELF = 'CANNOT_DELETE_SELF',
  TRANSFER_OWNERSHIP_FIRST = 'TRANSFER_OWNERSHIP_FIRST',
  OWNERSHIP_REQUIRES_ADMIN = 'OWNERSHIP_REQUIRES_ADMIN',
  ALREADY_WORKSPACE_MEMBER = 'ALREADY_WORKSPACE_MEMBER',
  ACCOUNT_UNAVAILABLE = 'ACCOUNT_UNAVAILABLE',
  MEMBERSHIP_ALREADY_LINKED = 'MEMBERSHIP_ALREADY_LINKED',
  SIGN_OUT_BEFORE_VERIFY = 'SIGN_OUT_BEFORE_VERIFY',
  GOOGLE_ACCOUNT_CONFLICT = 'GOOGLE_ACCOUNT_CONFLICT',
  SET_PASSWORD_BEFORE_EMAIL_CHANGE = 'SET_PASSWORD_BEFORE_EMAIL_CHANGE',
  USE_PASSWORD_RESET_TO_SET_PASSWORD = 'USE_PASSWORD_RESET_TO_SET_PASSWORD',
  VERIFY_EMAIL_BEFORE_GOOGLE_LINK = 'VERIFY_EMAIL_BEFORE_GOOGLE_LINK',
  SIGN_IN_BEFORE_GOOGLE_LINK = 'SIGN_IN_BEFORE_GOOGLE_LINK',
  GOOGLE_LINK_CHANGED_CONCURRENTLY = 'GOOGLE_LINK_CHANGED_CONCURRENTLY',
  SERVICE_ATTACHMENT_LIMIT_REACHED = 'SERVICE_ATTACHMENT_LIMIT_REACHED',
}

export class ConflictResponseDto {
  @ApiProperty({ example: HttpStatus.CONFLICT })
  statusCode!: number;

  @ApiProperty({ example: 'Conflict' })
  error!: string;

  @ApiProperty({ example: 'Registration number already in use' })
  message!: string;

  @ApiProperty({ enum: ConflictCode })
  code!: ConflictCode;

  @ApiProperty({ required: false, example: 'registrationNumber' })
  field?: string;
}

export function conflictException(
  message: string,
  code: ConflictCode,
  field?: string,
): ConflictException {
  return new ConflictException({
    statusCode: HttpStatus.CONFLICT,
    error: 'Conflict',
    message,
    code,
    ...(field ? { field } : {}),
  });
}
