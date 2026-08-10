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
import { AllowedOriginGuard } from '../common/allowed-origin.guard';
import { Serialize } from '../interceptors/serialize.interceptor';
import { CurrentPrincipal } from '../users/decorators/current-principal.decorator';
import { SessionAuthGuard } from '../users/guards/session-auth.guard';
import type { SessionPrincipal } from '../users/session-principal';
import { CreateVehicleDto } from './dtos/create-vehicle.dto';
import { ListVehiclesQueryDto } from './dtos/list-vehicles-query.dto';
import { UpdateVehicleDto } from './dtos/update-vehicle.dto';
import { VehicleDto } from './dtos/vehicle.dto';
import { VehicleListDto } from './dtos/vehicle-list.dto';
import type { VehicleView } from './vehicle-view';
import { VehiclesService } from './vehicles.service';
import { ManagerAssignmentDto } from './dtos/manager-assignment.dto';

@Controller('vehicles')
@UseGuards(SessionAuthGuard)
export class VehiclesController {
  constructor(private readonly vehicles: VehiclesService) {}

  @Get()
  @Serialize(VehicleListDto)
  list(
    @CurrentPrincipal() principal: SessionPrincipal,
    @Query() query: ListVehiclesQueryDto,
  ) {
    return this.vehicles.list(principal, query);
  }

  @Get(':id')
  @Serialize(VehicleDto)
  findOne(
    @CurrentPrincipal() principal: SessionPrincipal,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<VehicleView> {
    return this.vehicles.findOne(principal, id);
  }

  @Get(':id/manager-assignments')
  @Serialize(ManagerAssignmentDto)
  managerHistory(
    @CurrentPrincipal() principal: SessionPrincipal,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.vehicles.managerHistory(principal, id);
  }

  @Post()
  @Serialize(VehicleDto)
  @UseGuards(AllowedOriginGuard)
  create(
    @CurrentPrincipal() principal: SessionPrincipal,
    @Body() body: CreateVehicleDto,
  ): Promise<VehicleView> {
    return this.vehicles.create(principal, body);
  }

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
