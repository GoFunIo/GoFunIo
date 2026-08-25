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
import { Throttle } from '@nestjs/throttler';
import { AllowedOriginGuard } from '../common/allowed-origin.guard';
import { ApiAllowedOrigin, ApiSessionAuth } from '../common/swagger';
import { ConflictResponseDto } from '../common/conflict';
import { Serialize } from '../interceptors/serialize.interceptor';
import { CompanyUsersService, type CompanyUser } from './company-users.service';
import { CurrentPrincipal } from './decorators/current-principal.decorator';
import { CreateCompanyUserDto } from './dtos/create-company-user.dto';
import { UpdateCompanyUserDto } from './dtos/update-company-user.dto';
import { UserDto } from './dtos/user.dto';
import { AdminGuard } from './guards/admin.guard';
import { SessionAuthGuard } from './guards/session-auth.guard';
import type { SessionPrincipal } from './session-principal';

@ApiTags('Company Users')
@ApiSessionAuth()
@Controller('users')
@Serialize(UserDto)
@UseGuards(SessionAuthGuard)
export class CompanyUsersController {
  constructor(private readonly companyUsers: CompanyUsersService) {}

  @ApiOperation({
    summary: 'List company users',
    description:
      'Requires an ADMIN session. Copy a returned id for update, removal, or ownership transfer.',
  })
  @ApiOkResponse({ type: UserDto, isArray: true })
  @ApiUnauthorizedResponse({ description: 'Not authenticated' })
  @ApiForbiddenResponse({ description: 'Admin role required' })
  @Get()
  list(@CurrentPrincipal() principal: SessionPrincipal) {
    return this.companyUsers.list(principal);
  }

  @ApiOperation({
    summary: 'Create company user',
    description: 'Requires an ADMIN session.',
  })
  @ApiAllowedOrigin()
  @ApiCreatedResponse({ type: UserDto })
  @ApiUnauthorizedResponse({ description: 'Not authenticated' })
  @ApiForbiddenResponse({ description: 'Admin role required' })
  @ApiBadRequestResponse({ description: 'Validation failed' })
  @ApiConflictResponse({
    description: 'Email already in use',
    type: ConflictResponseDto,
  })
  @Post()
  @UseGuards(AdminGuard, AllowedOriginGuard)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  create(
    @CurrentPrincipal() principal: SessionPrincipal,
    @Body() body: CreateCompanyUserDto,
    @Headers('origin') origin?: string,
  ): Promise<CompanyUser> {
    return this.companyUsers.create(principal, body, origin);
  }

  @ApiOperation({ summary: 'Update company user' })
  @ApiAllowedOrigin()
  @ApiOkResponse({ type: UserDto })
  @ApiUnauthorizedResponse({ description: 'Not authenticated' })
  @ApiForbiddenResponse({ description: 'Admin role required' })
  @ApiBadRequestResponse({ description: 'Validation failed' })
  @ApiNotFoundResponse({ description: 'User not found' })
  @ApiConflictResponse({
    description: 'Cannot demote yourself or remove the last admin',
    type: ConflictResponseDto,
  })
  @Patch(':id')
  @UseGuards(AdminGuard, AllowedOriginGuard)
  update(
    @CurrentPrincipal() principal: SessionPrincipal,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: UpdateCompanyUserDto,
  ): Promise<CompanyUser> {
    return this.companyUsers.update(principal, id, body);
  }

  @ApiOperation({ summary: 'Remove company user' })
  @ApiAllowedOrigin()
  @ApiNoContentResponse()
  @ApiUnauthorizedResponse({ description: 'Not authenticated' })
  @ApiForbiddenResponse({ description: 'Admin role required' })
  @ApiNotFoundResponse({ description: 'User not found' })
  @ApiConflictResponse({
    description: 'Cannot delete yourself or the last admin',
    type: ConflictResponseDto,
  })
  @Delete(':id')
  @HttpCode(204)
  @UseGuards(AdminGuard, AllowedOriginGuard)
  remove(
    @CurrentPrincipal() principal: SessionPrincipal,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    return this.companyUsers.remove(principal, id);
  }

  @ApiOperation({
    summary: 'Transfer workspace ownership to an active admin',
    description:
      'Requires the current workspace OWNER and an active ADMIN target.',
  })
  @ApiAllowedOrigin()
  @ApiNoContentResponse()
  @ApiForbiddenResponse({ description: 'Owner role required' })
  @ApiConflictResponse({
    description: 'Target must be an active admin',
    type: ConflictResponseDto,
  })
  @Post(':id/transfer-ownership')
  @HttpCode(204)
  @UseGuards(AdminGuard, AllowedOriginGuard)
  transferOwnership(
    @CurrentPrincipal() principal: SessionPrincipal,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    return this.companyUsers.transferOwnership(principal, id);
  }
}
