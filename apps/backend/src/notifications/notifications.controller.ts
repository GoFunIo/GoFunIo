import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  UseGuards,
} from '@nestjs/common';
import {
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { ApiSessionAuth, ApiUuidParam } from '../common/swagger';
import { Serialize } from '../interceptors/serialize.interceptor';
import { CurrentPrincipal } from '../users/decorators/current-principal.decorator';
import { SessionAuthGuard } from '../users/guards/session-auth.guard';
import type { SessionPrincipal } from '../users/session-principal';
import {
  NotificationListDto,
  VehicleDeadlineNotificationDto,
} from './dtos/notification.dto';
import { NotificationsService } from './notifications.service';

@ApiTags('Notifications')
@ApiSessionAuth()
@Controller('notifications')
@UseGuards(SessionAuthGuard)
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}
  @ApiOperation({ summary: 'List current authorized Notifications' })
  @ApiOkResponse({ type: NotificationListDto })
  @ApiUnauthorizedResponse({ description: 'Not authenticated' })
  @Get()
  @Serialize(NotificationListDto)
  list(@CurrentPrincipal() principal: SessionPrincipal) {
    return this.notifications.list(principal);
  }

  @ApiOperation({ summary: 'Get an authorized typed Notification' })
  @ApiUuidParam('id', 'Notification id')
  @ApiOkResponse({ type: VehicleDeadlineNotificationDto })
  @ApiUnauthorizedResponse({ description: 'Not authenticated' })
  @ApiNotFoundResponse({ description: 'Notification not found' })
  @Get(':id')
  @Serialize(VehicleDeadlineNotificationDto)
  detail(
    @CurrentPrincipal() principal: SessionPrincipal,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.notifications.detail(principal, id);
  }
}
