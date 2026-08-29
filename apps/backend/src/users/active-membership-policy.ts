import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Membership } from './membership.entity';

export const ACTIVE_MEMBERSHIP_POLICY = Symbol('ACTIVE_MEMBERSHIP_POLICY');

export interface MembershipScope {
  companyId: string;
  userId: string;
}

export interface ActiveMembershipPolicy {
  isActive(scope: MembershipScope): Promise<boolean>;
}

@Injectable()
export class TypeOrmActiveMembershipPolicy implements ActiveMembershipPolicy {
  constructor(
    @InjectRepository(Membership)
    private readonly memberships: Repository<Membership>,
  ) {}

  isActive(scope: MembershipScope): Promise<boolean> {
    return this.memberships.existsBy({ ...scope, status: 'active' });
  }
}
