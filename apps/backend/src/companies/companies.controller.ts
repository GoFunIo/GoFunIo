import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { AllowedOriginGuard } from '../common/allowed-origin.guard';
import { Serialize } from '../interceptors/serialize.interceptor';
import { CurrentPrincipal } from '../users/decorators/current-principal.decorator';
import { AdminGuard } from '../users/guards/admin.guard';
import { SessionAuthGuard } from '../users/guards/session-auth.guard';
import type { SessionPrincipal } from '../users/session-principal';
import { CompaniesService } from './companies.service';
import { CompanyDto } from './dtos/company.dto';
import { UpdateCompanyDto } from './dtos/update-company.dto';

@Controller('company')
@Serialize(CompanyDto)
export class CompaniesController {
  constructor(private companies: CompaniesService) {}

  @Get()
  @UseGuards(SessionAuthGuard)
  getCompany(@CurrentPrincipal() principal: SessionPrincipal) {
    return this.companies.findActive(principal.companyId);
  }

  @Patch()
  @UseGuards(SessionAuthGuard, AllowedOriginGuard, AdminGuard)
  updateCompany(
    @CurrentPrincipal() principal: SessionPrincipal,
    @Body() body: UpdateCompanyDto,
  ) {
    return this.companies.update(principal.companyId, body);
  }
}
