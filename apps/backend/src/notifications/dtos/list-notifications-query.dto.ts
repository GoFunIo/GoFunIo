import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { NotificationCategory } from '../../notification-preferences/notification-preference.entity';

function booleanQueryValue(value: unknown): unknown {
  if (value === 'true') return true;
  if (value === 'false') return false;
  return value;
}

export class ListNotificationsQueryDto {
  @ApiPropertyOptional({
    enum: NotificationCategory,
    description: 'Return only Notifications in this category.',
  })
  @IsOptional()
  @IsEnum(NotificationCategory)
  category?: NotificationCategory;

  @ApiPropertyOptional({
    type: Boolean,
    description:
      'When true, return unread Notifications; when false, return read Notifications.',
  })
  @Transform(({ value }: { value: unknown }) => booleanQueryValue(value))
  @IsOptional()
  @IsBoolean()
  unread?: boolean;

  @ApiPropertyOptional({
    type: Boolean,
    default: false,
    description:
      'When true, return archived Notifications. The main inbox defaults to unarchived Notifications.',
  })
  @Transform(({ value }: { value: unknown }) => booleanQueryValue(value))
  @IsBoolean()
  archived = false;

  @ApiPropertyOptional({
    minimum: 1,
    maximum: 100,
    default: 20,
    description: 'Page size. Defaults to 20 and cannot exceed 100.',
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 20;

  @ApiPropertyOptional({
    description:
      'Opaque cursor returned by the previous page. Reuse it only for the same Membership, Active Workspace, and filters; it follows createdAt and Notification id in descending order.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(2048)
  cursor?: string;
}
