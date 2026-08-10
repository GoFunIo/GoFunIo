import {
  Body,
  Controller,
  Get,
  Patch,
  Post,
  Session,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { AllowedOriginGuard } from '../common/allowed-origin.guard';
import { Serialize } from '../interceptors/serialize.interceptor';
import type { SessionData } from '../types/session.types';
import { CurrentPrincipal } from '../users/decorators/current-principal.decorator';
import { AdminGuard } from '../users/guards/admin.guard';
import { SessionAuthGuard } from '../users/guards/session-auth.guard';
import {
  requireCompanyId,
  type SessionPrincipal,
} from '../users/session-principal';
import { SessionsService } from '../users/sessions.service';
import { CompaniesService } from './companies.service';
import { CreateCompanyDto } from './dtos/create-company.dto';
import { CompanyDto } from './dtos/company.dto';
import { UpdateCompanyDto } from './dtos/update-company.dto';

@ApiTags('Companies')
@Controller()
@Serialize(CompanyDto)
export class CompaniesController {
  constructor(
    private readonly companies: CompaniesService,
    private readonly sessions: SessionsService,
  ) {}

  @ApiOperation({ summary: 'Get active company' })
  @ApiOkResponse({ type: CompanyDto })
  @ApiUnauthorizedResponse({ description: 'Not authenticated' })
  @ApiNotFoundResponse({ description: 'Company not found' })
  @Get('company')
  @UseGuards(SessionAuthGuard)
  getCompany(@CurrentPrincipal() principal: SessionPrincipal) {
    return this.companies.findActive(requireCompanyId(principal));
  }

  @ApiOperation({ summary: 'Update active company' })
  @ApiOkResponse({ type: CompanyDto })
  @ApiUnauthorizedResponse({ description: 'Not authenticated' })
  @ApiForbiddenResponse({ description: 'Admin role required' })
  @ApiBadRequestResponse({ description: 'Validation failed' })
  @ApiNotFoundResponse({ description: 'Company not found' })
  @Patch('company')
  @UseGuards(SessionAuthGuard, AllowedOriginGuard, AdminGuard)
  updateCompany(
    @CurrentPrincipal() principal: SessionPrincipal,
    @Body() body: UpdateCompanyDto,
  ) {
    return this.companies.update(requireCompanyId(principal), body);
  }

  @ApiOperation({ summary: 'Create company and switch to it' })
  @ApiCreatedResponse({ type: CompanyDto })
  @ApiUnauthorizedResponse({ description: 'Not authenticated' })
  @ApiBadRequestResponse({ description: 'Validation failed' })
  @Post('companies')
  @UseGuards(SessionAuthGuard, AllowedOriginGuard)
  async createCompany(
    @CurrentPrincipal() principal: SessionPrincipal,
    @Session() session: SessionData,
    @Body() body: CreateCompanyDto,
  ) {
    const company = await this.companies.create(principal.id, body.name);
    await this.sessions.switchCompany(session, principal.id, company.id);
    return company;
  }
}
