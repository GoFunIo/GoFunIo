import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import {
  ApiAllowedOrigin,
  ApiSessionAuth,
  ApiUuidParam,
} from '../common/swagger';
import { AllowedOriginGuard } from '../common/allowed-origin.guard';
import { Serialize } from '../interceptors/serialize.interceptor';
import { CurrentPrincipal } from '../users/decorators/current-principal.decorator';
import { SessionAuthGuard } from '../users/guards/session-auth.guard';
import type { SessionPrincipal } from '../users/session-principal';
import {
  NotificationListDto,
  VehicleDeadlineNotificationDto,
} from './dtos/notification.dto';
import { ListNotificationsQueryDto } from './dtos/list-notifications-query.dto';
import {
  ReadAllNotificationsDto,
  ReadAllNotificationsResultDto,
} from './dtos/read-all-notifications.dto';
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
  @ApiBadRequestResponse({
    description: 'Invalid filter, limit, or opaque cursor.',
  })
  @Get()
  @Serialize(NotificationListDto)
  list(
    @CurrentPrincipal() principal: SessionPrincipal,
    @Query() query: ListNotificationsQueryDto,
  ) {
    return this.notifications.list(principal, query);
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

  @ApiOperation({
    summary: 'Mark all currently visible Notifications as read',
    description:
      'Updates only valid, currently authorized, unrevoked, unarchived caller Recipients. An optional category narrows the operation.',
  })
  @ApiAllowedOrigin()
  @ApiOkResponse({ type: ReadAllNotificationsResultDto })
  @ApiUnauthorizedResponse({ description: 'Not authenticated' })
  @ApiForbiddenResponse({ description: 'Origin not allowed' })
  @ApiBadRequestResponse({ description: 'Unsupported category or body.' })
  @Post('read-all')
  @HttpCode(200)
  @UseGuards(AllowedOriginGuard)
  @Serialize(ReadAllNotificationsResultDto)
  readAll(
    @CurrentPrincipal() principal: SessionPrincipal,
    @Body() body: ReadAllNotificationsDto,
  ) {
    return this.notifications.readAll(principal, body.category);
  }

  @ApiOperation({
    summary: 'Mark the caller Recipient as read',
    description:
      'Idempotently fills only the caller Recipient readAt after current validity and authorization checks.',
  })
  @ApiAllowedOrigin()
  @ApiUuidParam('id', 'Notification id')
  @ApiOkResponse({ type: VehicleDeadlineNotificationDto })
  @ApiUnauthorizedResponse({ description: 'Not authenticated' })
  @ApiForbiddenResponse({ description: 'Origin not allowed' })
  @ApiNotFoundResponse({ description: 'Notification not found' })
  @Patch(':id/read')
  @UseGuards(AllowedOriginGuard)
  @Serialize(VehicleDeadlineNotificationDto)
  markRead(
    @CurrentPrincipal() principal: SessionPrincipal,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.notifications.markRead(principal, id);
  }

  @ApiOperation({
    summary: 'Archive the caller Recipient',
    description:
      'Idempotently fills only the caller Recipient archivedAt and fills readAt when absent, after current validity and authorization checks.',
  })
  @ApiAllowedOrigin()
  @ApiUuidParam('id', 'Notification id')
  @ApiOkResponse({ type: VehicleDeadlineNotificationDto })
  @ApiUnauthorizedResponse({ description: 'Not authenticated' })
  @ApiForbiddenResponse({ description: 'Origin not allowed' })
  @ApiNotFoundResponse({ description: 'Notification not found' })
  @Patch(':id/archive')
  @UseGuards(AllowedOriginGuard)
  @Serialize(VehicleDeadlineNotificationDto)
  archive(
    @CurrentPrincipal() principal: SessionPrincipal,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.notifications.archive(principal, id);
  }
}
