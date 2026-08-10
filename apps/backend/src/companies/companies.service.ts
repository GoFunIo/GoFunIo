import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Membership } from '../users/membership.entity';
import { MembershipRole } from '../users/membership-role';
import { Company } from './companies.entity';
import { UpdateCompanyDto } from './dtos/update-company.dto';

@Injectable()
export class CompaniesService {
  constructor(
    @InjectRepository(Company)
    private companies: Repository<Company>,
  ) {}

  async findActive(id: string): Promise<Company> {
    const company = await this.companies.findOneBy({ id });
    if (!company) throw new NotFoundException('Company not found');
    return company;
  }

  async update(id: string, attrs: UpdateCompanyDto): Promise<Company> {
    const company = await this.findActive(id);
    Object.assign(company, attrs);
    return this.companies.save(company);
  }

  create(userId: string, name: string): Promise<Company> {
    return this.companies.manager.transaction(async (manager) => {
      const company = await manager.save(manager.create(Company, { name }));
      await manager.save(
        manager.create(Membership, {
          userId,
          companyId: company.id,
          role: MembershipRole.ADMIN,
        }),
      );
      return company;
    });
  }
}
