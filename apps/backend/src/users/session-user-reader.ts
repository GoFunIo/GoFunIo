import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Company } from '../companies/companies.entity';
import type { MembershipRole } from './membership-role';
import { Membership } from './membership.entity';
import { User } from './users.entity';

export const SESSION_USER_READER = Symbol('SESSION_USER_READER');

export interface SessionMembership {
  companyId: string;
  companyName: string;
  role: MembershipRole;
}

export interface SessionUser {
  id: string;
  passwordVersion: number;
  memberships: SessionMembership[];
}

export interface SessionUserReader {
  findActiveById(id: string): Promise<SessionUser | null>;
}

@Injectable()
export class TypeOrmSessionUserReader implements SessionUserReader {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(Membership)
    private readonly memberships: Repository<Membership>,
  ) {}

  async findActiveById(id: string): Promise<SessionUser | null> {
    const user = await this.users
      .createQueryBuilder('user')
      .select(['user.id', 'user.passwordVersion'])
      .where('user.id = :id', { id })
      .getOne();
    if (!user) return null;

    const memberships = await this.memberships
      .createQueryBuilder('membership')
      .select('membership.companyId', 'companyId')
      .addSelect('membership.role', 'role')
      .addSelect('company.name', 'companyName')
      .innerJoin(
        Company,
        'company',
        'company.id = membership.companyId AND company."deletedAt" IS NULL',
      )
      .where('membership.userId = :id', { id })
      .andWhere('membership.status = :status', { status: 'active' })
      .orderBy('membership.createdAt', 'ASC')
      .getRawMany<SessionMembership>();

    return {
      id: user.id,
      passwordVersion: user.passwordVersion,
      memberships,
    };
  }
}
