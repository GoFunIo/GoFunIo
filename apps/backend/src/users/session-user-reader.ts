import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { SessionPrincipal } from './session-principal';
import { User } from './users.entity';

export const SESSION_USER_READER = Symbol('SESSION_USER_READER');

export interface SessionUser extends SessionPrincipal {
  passwordVersion: number;
}

export interface SessionUserReader {
  findActiveById(id: string): Promise<SessionUser | null>;
}

@Injectable()
export class TypeOrmSessionUserReader implements SessionUserReader {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
  ) {}

  findActiveById(id: string): Promise<SessionUser | null> {
    return this.users
      .createQueryBuilder('user')
      .select([
        'user.id',
        'user.companyId',
        'user.role',
        'user.passwordVersion',
      ])
      .innerJoin('user.company', 'company')
      .where('user.id = :id', { id })
      .andWhere('company."deletedAt" IS NULL')
      .getOne();
  }
}
