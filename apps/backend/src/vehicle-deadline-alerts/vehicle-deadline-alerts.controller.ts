import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { ApiSessionAuth } from '../common/swagger';
import { Serialize } from '../interceptors/serialize.interceptor';
import { CurrentPrincipal } from '../users/decorators/current-principal.decorator';
import { SessionAuthGuard } from '../users/guards/session-auth.guard';
import type { SessionPrincipal } from '../users/session-principal';
import { ListVehicleDeadlineAlertsQueryDto } from './dtos/list-vehicle-deadline-alerts-query.dto';
import {
  NotificationCenterSummaryDto,
  VehicleDeadlineAlertListDto,
} from './dtos/vehicle-deadline-alert.dto';
import { VehicleDeadlineAlertsService } from './vehicle-deadline-alerts.service';

@ApiTags('Vehicle Deadline Alerts')
@ApiSessionAuth()
@Controller()
@UseGuards(SessionAuthGuard)
export class VehicleDeadlineAlertsController {
  constructor(private readonly alerts: VehicleDeadlineAlertsService) {}

  @ApiOperation({
    summary: 'List active Vehicle Deadline Alerts',
    description:
      'Projects current visible Vehicle deadlines using the Active Workspace policy and calendar date.',
  })
  @ApiOkResponse({ type: VehicleDeadlineAlertListDto })
  @ApiUnauthorizedResponse({ description: 'Not authenticated' })
  @ApiBadRequestResponse({
    description: 'Invalid filter, limit, or opaque cursor.',
  })
  @Get('vehicle-deadline-alerts')
  @Serialize(VehicleDeadlineAlertListDto)
  list(
    @CurrentPrincipal() principal: SessionPrincipal,
    @Query() query: ListVehicleDeadlineAlertsQueryDto,
  ) {
    return this.alerts.list(principal, query);
  }

  @ApiOperation({
    summary: 'Get Notification Center summary',
    description:
      'Keeps active Alert and unread Notification counts separate. Durable Notifications are not implemented yet.',
  })
  @ApiOkResponse({ type: NotificationCenterSummaryDto })
  @ApiUnauthorizedResponse({ description: 'Not authenticated' })
  @Get('notification-center/summary')
  @Serialize(NotificationCenterSummaryDto)
  summary(@CurrentPrincipal() principal: SessionPrincipal) {
    return this.alerts.summary(principal);
  }
}
