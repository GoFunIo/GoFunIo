import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Expose } from 'class-transformer';
import { IsEnum, IsOptional } from 'class-validator';
import { NotificationCategory } from '../../notification-preferences/notification-preference.entity';

export class ReadAllNotificationsDto {
  @ApiPropertyOptional({
    enum: NotificationCategory,
    description:
      'When supplied, mark only currently visible unarchived Notifications in this category.',
  })
  @IsOptional()
  @IsEnum(NotificationCategory)
  category?: NotificationCategory;
}

export class ReadAllNotificationsResultDto {
  @ApiProperty({
    minimum: 0,
    description:
      'Number of caller Recipient rows changed from unread to read by this request.',
  })
  @Expose()
  updatedCount!: number;
}
