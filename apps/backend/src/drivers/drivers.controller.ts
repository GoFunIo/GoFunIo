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
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { AllowedOriginGuard } from '../common/allowed-origin.guard';
import { ConflictResponseDto } from '../common/conflict';
import { Serialize } from '../interceptors/serialize.interceptor';
import { CurrentPrincipal } from '../users/decorators/current-principal.decorator';
import { AdminGuard } from '../users/guards/admin.guard';
import { SessionAuthGuard } from '../users/guards/session-auth.guard';
import type { SessionPrincipal } from '../users/session-principal';
import { CreateDriverDto } from './dtos/create-driver.dto';
import { DriverDto } from './dtos/driver.dto';
import { UpdateDriverDto } from './dtos/update-driver.dto';
import type { DriverView } from './driver-view';
import { Driver } from './drivers.entity';
import { DriversService } from './drivers.service';

@ApiTags('Drivers')
@Controller('drivers')
@Serialize(DriverDto)
@UseGuards(SessionAuthGuard)
export class DriversController {
  constructor(private readonly drivers: DriversService) {}

  @ApiOperation({ summary: 'List drivers' })
  @ApiOkResponse({ type: DriverDto, isArray: true })
  @ApiUnauthorizedResponse({ description: 'Not authenticated' })
  @Get()
  list(@CurrentPrincipal() principal: SessionPrincipal): Promise<DriverView[]> {
    return this.drivers.list(principal);
  }

  @ApiOperation({ summary: 'Get driver by id' })
  @ApiOkResponse({ type: DriverDto })
  @ApiUnauthorizedResponse({ description: 'Not authenticated' })
  @ApiNotFoundResponse({ description: 'Driver not found' })
  @Get(':id')
  findOne(
    @CurrentPrincipal() principal: SessionPrincipal,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<DriverView> {
    return this.drivers.findOne(principal, id);
  }

  @ApiOperation({ summary: 'Create driver' })
  @ApiCreatedResponse({ type: DriverDto })
  @ApiUnauthorizedResponse({ description: 'Not authenticated' })
  @ApiBadRequestResponse({ description: 'Validation failed' })
  @ApiConflictResponse({
    description: 'Membership already linked',
    type: ConflictResponseDto,
  })
  @Post()
  @UseGuards(AllowedOriginGuard)
  create(
    @CurrentPrincipal() principal: SessionPrincipal,
    @Body() body: CreateDriverDto,
  ): Promise<Driver> {
    return this.drivers.create(principal, body);
  }

  @ApiOperation({ summary: 'Update driver' })
  @ApiOkResponse({ type: DriverDto })
  @ApiUnauthorizedResponse({ description: 'Not authenticated' })
  @ApiBadRequestResponse({ description: 'Validation failed' })
  @ApiConflictResponse({
    description: 'Membership already linked',
    type: ConflictResponseDto,
  })
  @ApiNotFoundResponse({ description: 'Driver not found' })
  @Patch(':id')
  @UseGuards(AllowedOriginGuard)
  update(
    @CurrentPrincipal() principal: SessionPrincipal,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: UpdateDriverDto,
  ): Promise<Driver> {
    return this.drivers.update(principal, id, body);
  }

  @ApiOperation({ summary: 'Delete driver' })
  @ApiNoContentResponse()
  @ApiUnauthorizedResponse({ description: 'Not authenticated' })
  @ApiForbiddenResponse({ description: 'Admin role required' })
  @ApiNotFoundResponse({ description: 'Driver not found' })
  @Delete(':id')
  @HttpCode(204)
  @UseGuards(AdminGuard, AllowedOriginGuard)
  remove(
    @CurrentPrincipal() principal: SessionPrincipal,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    return this.drivers.remove(principal, id);
  }
}
