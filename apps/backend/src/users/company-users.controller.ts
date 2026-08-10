import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { AllowedOriginGuard } from '../common/allowed-origin.guard';
import { Serialize } from '../interceptors/serialize.interceptor';
import { CompanyUsersService, type CompanyUser } from './company-users.service';
import { CurrentPrincipal } from './decorators/current-principal.decorator';
import { CreateCompanyUserDto } from './dtos/create-company-user.dto';
import { UpdateCompanyUserDto } from './dtos/update-company-user.dto';
import { UserDto } from './dtos/user.dto';
import { AdminGuard } from './guards/admin.guard';
import { SessionAuthGuard } from './guards/session-auth.guard';
import { requireCompanyId, type SessionPrincipal } from './session-principal';

@ApiTags('Company Users')
@Controller('users')
@Serialize(UserDto)
@UseGuards(SessionAuthGuard, AdminGuard)
export class CompanyUsersController {
  constructor(private readonly companyUsers: CompanyUsersService) {}

  @ApiOperation({ summary: 'List company users' })
  @Get()
  list(
    @CurrentPrincipal() principal: SessionPrincipal,
  ): Promise<CompanyUser[]> {
    return this.companyUsers.list(requireCompanyId(principal));
  }

  @ApiOperation({ summary: 'Create company user' })
  @Post()
  @UseGuards(AllowedOriginGuard)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  create(
    @CurrentPrincipal() principal: SessionPrincipal,
    @Body() body: CreateCompanyUserDto,
    @Headers('origin') origin?: string,
  ): Promise<CompanyUser> {
    return this.companyUsers.create(principal, body, origin);
  }

  @ApiOperation({ summary: 'Update company user' })
  @Patch(':id')
  @UseGuards(AllowedOriginGuard)
  update(
    @CurrentPrincipal() principal: SessionPrincipal,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: UpdateCompanyUserDto,
  ): Promise<CompanyUser> {
    return this.companyUsers.update(principal, id, body);
  }

  @ApiOperation({ summary: 'Remove company user' })
  @Delete(':id')
  @HttpCode(204)
  @UseGuards(AllowedOriginGuard)
  remove(
    @CurrentPrincipal() principal: SessionPrincipal,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    return this.companyUsers.remove(principal, id);
  }
}
