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
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { AllowedOriginGuard } from '../common/allowed-origin.guard';
import {
  ApiAllowedOrigin,
  ApiSessionAuth,
  ApiUuidParam,
} from '../common/swagger';
import { ConflictResponseDto } from '../common/conflict';
import { Serialize } from '../interceptors/serialize.interceptor';
import { CurrentPrincipal } from '../users/decorators/current-principal.decorator';
import { SessionAuthGuard } from '../users/guards/session-auth.guard';
import { AdminGuard } from '../users/guards/admin.guard';
import type { SessionPrincipal } from '../users/session-principal';
import { CreateVehicleDto } from './dtos/create-vehicle.dto';
import { ListVehiclesQueryDto } from './dtos/list-vehicles-query.dto';
import { UpdateVehicleDto } from './dtos/update-vehicle.dto';
import { VehicleDto } from './dtos/vehicle.dto';
import { VehicleListDto } from './dtos/vehicle-list.dto';
import type { VehicleView } from './vehicle-view';
import { VehiclesService } from './vehicles.service';
import { ManagerAssignmentDto } from './dtos/manager-assignment.dto';
import { CreateManagerAssignmentDto } from './dtos/create-manager-assignment.dto';

@ApiTags('Vehicles')
@ApiSessionAuth()
@Controller('vehicles')
@UseGuards(SessionAuthGuard)
export class VehiclesController {
  constructor(private readonly vehicles: VehiclesService) {}

  @ApiOperation({ summary: 'List vehicles' })
  @ApiOkResponse({ type: VehicleListDto })
  @ApiUnauthorizedResponse({ description: 'Not authenticated' })
  @Get()
  @Serialize(VehicleListDto)
  list(
    @CurrentPrincipal() principal: SessionPrincipal,
    @Query() query: ListVehiclesQueryDto,
  ) {
    return this.vehicles.list(principal, query);
  }

  @ApiOperation({ summary: 'Get vehicle by id' })
  @ApiUuidParam('id', 'Vehicle id')
  @ApiOkResponse({ type: VehicleDto })
  @ApiUnauthorizedResponse({ description: 'Not authenticated' })
  @ApiNotFoundResponse({ description: 'Vehicle not found' })
  @Get(':id')
  @Serialize(VehicleDto)
  findOne(
    @CurrentPrincipal() principal: SessionPrincipal,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<VehicleView> {
    return this.vehicles.findOne(principal, id);
  }

  @ApiOperation({ summary: 'List manager assignment history for vehicle' })
  @ApiUuidParam('id', 'Vehicle id')
  @ApiOkResponse({ type: ManagerAssignmentDto, isArray: true })
  @ApiUnauthorizedResponse({ description: 'Not authenticated' })
  @ApiNotFoundResponse({ description: 'Vehicle not found' })
  @Get(':id/manager-assignments')
  @Serialize(ManagerAssignmentDto)
  managerHistory(
    @CurrentPrincipal() principal: SessionPrincipal,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.vehicles.managerHistory(principal, id);
  }

  @ApiOperation({
    summary: 'Create vehicle',
    description:
      'Requires an OWNER, ADMIN or MANAGER session. A MANAGER is automatically assigned to the created vehicle. Copy the returned id for assignments and services.',
  })
  @ApiAllowedOrigin()
  @ApiCreatedResponse({ type: VehicleDto })
  @ApiUnauthorizedResponse({ description: 'Not authenticated' })
  @ApiBadRequestResponse({ description: 'Validation failed' })
  @ApiConflictResponse({
    description: 'Registration number or VIN already in use',
    type: ConflictResponseDto,
  })
  @Post()
  @Serialize(VehicleDto)
  @UseGuards(AllowedOriginGuard)
  create(
    @CurrentPrincipal() principal: SessionPrincipal,
    @Body() body: CreateVehicleDto,
  ): Promise<VehicleView> {
    return this.vehicles.create(principal, body);
  }

  @ApiOperation({
    summary: 'Assign manager to vehicle',
    description: 'Requires an ADMIN session; managerId is a company-user id.',
  })
  @ApiAllowedOrigin()
  @ApiUuidParam('id', 'Vehicle id')
  @ApiCreatedResponse({ type: ManagerAssignmentDto })
  @ApiUnauthorizedResponse({ description: 'Not authenticated' })
  @ApiBadRequestResponse({ description: 'Validation failed' })
  @ApiNotFoundResponse({ description: 'Vehicle not found' })
  @Post(':id/managers')
  @Serialize(ManagerAssignmentDto)
  @UseGuards(AllowedOriginGuard, AdminGuard)
  assignManager(
    @CurrentPrincipal() principal: SessionPrincipal,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: CreateManagerAssignmentDto,
  ) {
    return this.vehicles.assignManager(principal, id, body);
  }

  @ApiOperation({
    summary: 'Unassign manager from vehicle',
    description: 'Requires an ADMIN session.',
  })
  @ApiAllowedOrigin()
  @ApiUuidParam('id', 'Vehicle id')
  @ApiUuidParam('managerId', 'Manager user id')
  @ApiNoContentResponse()
  @ApiUnauthorizedResponse({ description: 'Not authenticated' })
  @ApiNotFoundResponse({ description: 'Vehicle or assignment not found' })
  @Delete(':id/managers/:managerId')
  @HttpCode(204)
  @UseGuards(AllowedOriginGuard, AdminGuard)
  unassignManager(
    @CurrentPrincipal() principal: SessionPrincipal,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('managerId', ParseUUIDPipe) managerId: string,
  ): Promise<void> {
    return this.vehicles.unassignManager(principal, id, managerId);
  }

  @ApiOperation({ summary: 'Update vehicle' })
  @ApiAllowedOrigin()
  @ApiUuidParam('id', 'Vehicle id')
  @ApiOkResponse({ type: VehicleDto })
  @ApiUnauthorizedResponse({ description: 'Not authenticated' })
  @ApiBadRequestResponse({ description: 'Validation failed' })
  @ApiNotFoundResponse({ description: 'Vehicle not found' })
  @ApiConflictResponse({
    description: 'Registration number or VIN already in use',
    type: ConflictResponseDto,
  })
  @Patch(':id')
  @Serialize(VehicleDto)
  @UseGuards(AllowedOriginGuard)
  update(
    @CurrentPrincipal() principal: SessionPrincipal,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: UpdateVehicleDto,
  ): Promise<VehicleView> {
    return this.vehicles.update(principal, id, body);
  }

  @ApiOperation({ summary: 'Delete vehicle' })
  @ApiAllowedOrigin()
  @ApiUuidParam('id', 'Vehicle id')
  @ApiNoContentResponse()
  @ApiUnauthorizedResponse({ description: 'Not authenticated' })
  @ApiNotFoundResponse({ description: 'Vehicle not found' })
  @Delete(':id')
  @HttpCode(204)
  @UseGuards(AllowedOriginGuard)
  remove(
    @CurrentPrincipal() principal: SessionPrincipal,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    return this.vehicles.remove(principal, id);
  }
}
