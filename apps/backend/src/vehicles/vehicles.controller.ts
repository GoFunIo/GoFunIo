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
import { CurrentUser } from '../users/decorators/current-user.decorator';
import { SessionAuthGuard } from '../users/guards/session-auth.guard';
import { User } from '../users/users.entity';
import { CreateVehicleDto } from './dtos/create-vehicle.dto';
import { ListVehiclesQueryDto } from './dtos/list-vehicles-query.dto';
import { UpdateVehicleDto } from './dtos/update-vehicle.dto';
import { VehicleDto } from './dtos/vehicle.dto';
import { VehicleListDto } from './dtos/vehicle-list.dto';
import { Vehicle } from './vehicles.entity';
import { VehiclesService } from './vehicles.service';
import { ManagerAssignmentDto } from './dtos/manager-assignment.dto';

@Controller('vehicles')
@UseGuards(SessionAuthGuard)
export class VehiclesController {
  constructor(private readonly vehicles: VehiclesService) {}

  @Get()
  @Serialize(VehicleListDto)
  list(@CurrentUser() user: User, @Query() query: ListVehiclesQueryDto) {
    return this.vehicles.list(user, query);
  }

  @Get(':id')
  @Serialize(VehicleDto)
  findOne(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<Vehicle> {
    return this.vehicles.findOne(user, id);
  }

  @Get(':id/manager-assignments')
  @Serialize(ManagerAssignmentDto)
  managerHistory(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.vehicles.managerHistory(user, id);
  }

  @Post()
  @Serialize(VehicleDto)
  @UseGuards(AllowedOriginGuard)
  create(
    @CurrentUser() user: User,
    @Body() body: CreateVehicleDto,
  ): Promise<Vehicle> {
    return this.vehicles.create(user, body);
  }

  @Patch(':id')
  @Serialize(VehicleDto)
  @UseGuards(AllowedOriginGuard)
  update(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: UpdateVehicleDto,
  ): Promise<Vehicle> {
    return this.vehicles.update(user, id, body);
  }

  @Delete(':id')
  @HttpCode(204)
  @UseGuards(AllowedOriginGuard)
  remove(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    return this.vehicles.remove(user, id);
  }
}
