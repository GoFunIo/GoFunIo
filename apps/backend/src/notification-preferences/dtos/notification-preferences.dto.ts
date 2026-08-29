import { ApiProperty } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';
import {
  NotificationCategory,
  NotificationEmailMode,
} from '../notification-preference.entity';

export class NotificationPreferenceDto {
  @ApiProperty({ enum: NotificationCategory })
  @Expose()
  category!: NotificationCategory;

  @ApiProperty({ enum: NotificationEmailMode })
  @Expose()
  emailMode!: NotificationEmailMode;

  @ApiProperty({ type: Boolean })
  @Expose()
  showLiveToasts!: boolean;
}

export class NotificationPreferencesDto {
  @ApiProperty({
    type: [NotificationPreferenceDto],
    minItems: 5,
    maxItems: 5,
    description: 'One effective preference for every supported category.',
  })
  @Expose()
  @Type(() => NotificationPreferenceDto)
  preferences!: NotificationPreferenceDto[];
}
