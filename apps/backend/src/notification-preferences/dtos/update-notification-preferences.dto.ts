import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsEnum,
  ValidateBy,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import {
  NotificationCategory,
  NotificationEmailMode,
} from '../notification-preference.entity';

export class UpdateNotificationPreferenceDto {
  @ApiProperty({ enum: NotificationCategory })
  @IsEnum(NotificationCategory)
  category!: NotificationCategory;

  @ApiPropertyOptional({ enum: NotificationEmailMode })
  @ValidateIf((_object, value) => value !== undefined)
  @IsEnum(NotificationEmailMode)
  emailMode?: NotificationEmailMode;

  @ApiPropertyOptional({ type: Boolean })
  @ValidateIf((_object, value) => value !== undefined)
  @IsBoolean()
  showLiveToasts?: boolean;

  @ValidateBy({
    name: 'hasPreferenceChange',
    validator: {
      validate: (_value, args) => {
        const preference = args?.object as UpdateNotificationPreferenceDto;
        return (
          preference.emailMode !== undefined ||
          preference.showLiveToasts !== undefined
        );
      },
      defaultMessage: () =>
        'each preference must include emailMode or showLiveToasts',
    },
  })
  private readonly hasChange = true;
}

export class UpdateNotificationPreferencesDto {
  @ApiProperty({
    type: [UpdateNotificationPreferenceDto],
    minItems: 1,
    maxItems: 5,
    uniqueItems: true,
  })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(5)
  @ArrayUnique((preference: UpdateNotificationPreferenceDto) =>
    preference && typeof preference === 'object'
      ? preference.category
      : preference,
  )
  @ValidateNested({ each: true })
  @Type(() => UpdateNotificationPreferenceDto)
  preferences!: UpdateNotificationPreferenceDto[];
}
