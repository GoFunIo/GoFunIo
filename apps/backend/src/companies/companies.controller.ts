import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { AllowedOriginGuard } from '../common/allowed-origin.guard';
import { Serialize } from '../interceptors/serialize.interceptor';
import { CurrentUser } from '../users/decorators/current-user.decorator';
import { AdminGuard } from '../users/guards/admin.guard';
import { SessionAuthGuard } from '../users/guards/session-auth.guard';
import { User } from '../users/users.entity';
import { CompaniesService } from './companies.service';
import { CompanyDto } from './dtos/company.dto';
import { UpdateCompanyDto } from './dtos/update-company.dto';

@Controller('company')
@Serialize(CompanyDto)
export class CompaniesController {
  constructor(private companies: CompaniesService) {}

  @Get()
  @UseGuards(SessionAuthGuard)
  getCompany(@CurrentUser() user: User) {
    return this.companies.findActive(user.companyId);
  }

  @Patch()
  @UseGuards(SessionAuthGuard, AllowedOriginGuard, AdminGuard)
  updateCompany(@CurrentUser() user: User, @Body() body: UpdateCompanyDto) {
    return this.companies.update(user.companyId, body);
  }
}
