import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Company } from '../companies/companies.entity';
import {
  assertEmailClaimable,
  rethrowEmailClaimError,
} from './email-claim.util';
import { EmailRegistrationEmailInUseError } from './email-registration.errors';
import { Membership } from './membership.entity';
import { MembershipRole } from './membership-role';
import type { UserAccount } from './user-account';
import { User } from './users.entity';

export const WORKSPACE_OWNER_PROVISIONER = Symbol(
  'WORKSPACE_OWNER_PROVISIONER',
);

export interface WorkspaceOwnerProvisioning {
  email: string;
  passwordHash: string;
  verificationTokenHash: string;
  verificationTokenExpiresAt: Date;
}

export interface WorkspaceOwnerProvisioner {
  provision(input: WorkspaceOwnerProvisioning): Promise<UserAccount>;
}

@Injectable()
export class TypeOrmWorkspaceOwnerProvisioner implements WorkspaceOwnerProvisioner {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
  ) {}

  async provision(input: WorkspaceOwnerProvisioning): Promise<UserAccount> {
    try {
      return await this.users.manager.transaction(async (manager) => {
        await assertEmailClaimable(
          manager,
          input.email,
          () => new EmailRegistrationEmailInUseError(),
        );
        const company = await manager.save(
          manager.create(Company, { name: 'Moja firma' }),
        );
        const user = await manager.save(
          manager.create(User, {
            companyId: company.id,
            email: input.email,
            password: input.passwordHash,
            role: MembershipRole.ADMIN,
            verificationTokenHash: input.verificationTokenHash,
            verificationTokenExpiresAt: input.verificationTokenExpiresAt,
          }),
        );
        await manager.save(
          manager.create(Membership, {
            userId: user.id,
            companyId: user.companyId,
            role: user.role,
          }),
        );
        return {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          phone: user.phone,
          address: user.address,
          postalCode: user.postalCode,
          city: user.city,
          pendingEmail: user.pendingEmail,
          hasPassword: true,
        };
      });
    } catch (error) {
      rethrowEmailClaimError(
        error,
        () => new EmailRegistrationEmailInUseError(),
      );
    }
  }
}

export class FakeWorkspaceOwnerProvisioner implements WorkspaceOwnerProvisioner {
  readonly calls: WorkspaceOwnerProvisioning[] = [];
  error?: Error;

  provision(input: WorkspaceOwnerProvisioning): Promise<UserAccount> {
    this.calls.push(input);
    if (this.error) return Promise.reject(this.error);
    return Promise.resolve({
      id: `user-${this.calls.length}`,
      email: input.email,
      firstName: null,
      lastName: null,
      phone: null,
      address: null,
      postalCode: null,
      city: null,
      pendingEmail: null,
      hasPassword: true,
    });
  }
}
