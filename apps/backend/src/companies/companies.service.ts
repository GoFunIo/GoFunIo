import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
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
}
