import {
  Body,
  Controller,
  Delete,
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
  ApiCookieAuth,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { AllowedOriginGuard } from '../common/allowed-origin.guard';
import { ApiAllowedOrigin, ApiUuidParam } from '../common/swagger';
import { Serialize } from '../interceptors/serialize.interceptor';
import { CurrentPrincipal } from '../users/decorators/current-principal.decorator';
import { SessionAuthGuard } from '../users/guards/session-auth.guard';
import type { SessionPrincipal } from '../users/session-principal';
import { CreateServiceDto } from './dtos/create-service.dto';
import { ListServicesQueryDto } from './dtos/list-services-query.dto';
import { ServiceDto } from './dtos/service.dto';
import { ServiceListDto } from './dtos/service-list.dto';
import { UpdateServiceDto } from './dtos/update-service.dto';
import type { ServicePage, ServiceView } from './service-view';
import { ServicesService } from './services.service';

@ApiTags('Services')
@ApiCookieAuth('session')
@ApiUnauthorizedResponse({ description: 'Not authenticated' })
@ApiForbiddenResponse({ description: 'Origin or Workspace access denied' })
@Controller('services')
@UseGuards(SessionAuthGuard, AllowedOriginGuard)
export class ServicesController {
  constructor(private readonly services: ServicesService) {}

  @ApiOperation({
    summary: 'List Services for accessible active Vehicles',
    description:
      'OWNER and ADMIN see Services for every active Vehicle in the Active Workspace. MANAGER sees only Services for Vehicles granted through Vehicle Access. Filters combine with AND; date boundaries are inclusive. Totals cover the complete filtered result, not only the requested page.',
  })
  @ApiOkResponse({ type: ServiceListDto })
  @ApiBadRequestResponse({ description: 'Invalid filters or pagination' })
  @ApiNotFoundResponse({ description: 'Filtered Vehicle not found' })
  @Get()
  @Serialize(ServiceListDto)
  list(
    @CurrentPrincipal() principal: SessionPrincipal,
    @Query() query: ListServicesQueryDto,
  ): Promise<ServicePage> {
    return this.services.list(principal, query);
  }

  @ApiOperation({
    summary: 'Get an accessible active Service for editing',
    description:
      "Returns 404 when the Service or Vehicle is deleted, belongs to another Workspace, or is outside the caller's Vehicle Access.",
  })
  @ApiUuidParam('id', 'Service id')
  @ApiOkResponse({ type: ServiceDto })
  @ApiNotFoundResponse({ description: 'Service or Vehicle not found' })
  @Get(':id')
  @Serialize(ServiceDto)
  findOne(
    @CurrentPrincipal() principal: SessionPrincipal,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ServiceView> {
    return this.services.findOne(principal, id);
  }

  @ApiOperation({
    summary: 'Create a Service for an accessible active Vehicle',
    description:
      'Requires vehicleId, serviceDate, type, positive cost, and providerName. serviceDate cannot be in the future; notes are optional and limited to 5000 characters. OWNER and ADMIN may use any active Vehicle in the Active Workspace; MANAGER requires Vehicle Access.',
  })
  @ApiAllowedOrigin()
  @ApiCreatedResponse({ type: ServiceDto })
  @ApiBadRequestResponse({ description: 'Validation failed' })
  @ApiNotFoundResponse({ description: 'Vehicle not found' })
  @Post()
  @Serialize(ServiceDto)
  create(
    @CurrentPrincipal() principal: SessionPrincipal,
    @Body() body: CreateServiceDto,
  ): Promise<ServiceView> {
    return this.services.create(principal, body);
  }

  @ApiOperation({
    summary: 'Update only submitted Service fields',
    description:
      'Accepts the create fields as optional and applies only submitted fields. The same value validation applies. Moving a Service requires access to both its current Vehicle and the submitted active Vehicle in the same Workspace.',
  })
  @ApiAllowedOrigin()
  @ApiUuidParam('id', 'Service id')
  @ApiOkResponse({ type: ServiceDto })
  @ApiBadRequestResponse({ description: 'Validation failed' })
  @ApiNotFoundResponse({ description: 'Service or Vehicle not found' })
  @Patch(':id')
  @Serialize(ServiceDto)
  update(
    @CurrentPrincipal() principal: SessionPrincipal,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: UpdateServiceDto,
  ): Promise<ServiceView> {
    return this.services.update(principal, id, body);
  }

  @ApiOperation({
    summary: 'Delete an accessible active Service',
    description:
      "Soft-deletes the Service. Returns 404 when the Service or Vehicle is deleted, belongs to another Workspace, or is outside the caller's Vehicle Access.",
  })
  @ApiAllowedOrigin()
  @ApiUuidParam('id', 'Service id')
  @ApiNoContentResponse()
  @ApiNotFoundResponse({ description: 'Service or Vehicle not found' })
  @Delete(':id')
  @HttpCode(204)
  remove(
    @CurrentPrincipal() principal: SessionPrincipal,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    return this.services.remove(principal, id);
  }
}
