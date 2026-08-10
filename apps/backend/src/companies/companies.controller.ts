import {
  Body,
  Controller,
  Get,
  Patch,
  Post,
  Session,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
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
  @Get('company')
  @UseGuards(SessionAuthGuard)
  getCompany(@CurrentPrincipal() principal: SessionPrincipal) {
    return this.companies.findActive(requireCompanyId(principal));
  }

  @ApiOperation({ summary: 'Update active company' })
  @Patch('company')
  @UseGuards(SessionAuthGuard, AllowedOriginGuard, AdminGuard)
  updateCompany(
    @CurrentPrincipal() principal: SessionPrincipal,
    @Body() body: UpdateCompanyDto,
  ) {
    return this.companies.update(requireCompanyId(principal), body);
  }

  @ApiOperation({ summary: 'Create company and switch to it' })
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
