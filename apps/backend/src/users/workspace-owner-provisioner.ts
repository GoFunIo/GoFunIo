import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryFailedError, Repository } from 'typeorm';
import { Company } from '../companies/companies.entity';
import { assertEmailClaimable } from './email-claim.util';
import { Membership } from './membership.entity';
import { MembershipRole } from './membership-role';
import type { UserAccount } from './user-account';
import { User } from './users.entity';

export const WORKSPACE_OWNER_PROVISIONER = Symbol(
  'WORKSPACE_OWNER_PROVISIONER',
);

interface EmailWorkspaceOwnerProvisioning {
  email: string;
  passwordHash: string;
  verificationTokenHash: string;
  verificationTokenExpiresAt: Date;
}

interface GoogleWorkspaceOwnerProvisioning {
  email: string;
  googleId: string;
  firstName: string | null;
  lastName: string | null;
  emailVerifiedAt: Date;
}

export type WorkspaceOwnerProvisioning =
  | EmailWorkspaceOwnerProvisioning
  | GoogleWorkspaceOwnerProvisioning;

export class WorkspaceOwnerConflictError extends Error {
  constructor() {
    super('Workspace owner identity already in use');
  }
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
        await manager.query(
          'SELECT pg_advisory_xact_lock(hashtextextended($1, 0))',
          [input.email],
        );
        const existing = await manager
          .createQueryBuilder(User, 'user')
          .withDeleted()
          .addSelect('user.password')
          .where('user.email = :email', { email: input.email })
          .getOne();
        const reservation =
          'passwordHash' in input &&
          existing?.deletedAt === null &&
          existing.password === null &&
          existing.googleId === null &&
          existing.emailVerifiedAt === null &&
          (await manager.exists(Membership, {
            where: { userId: existing.id, status: 'pending' },
          })) &&
          !(await manager.exists(Membership, {
            where: { userId: existing.id, status: 'active' },
          }))
            ? existing
            : null;
        await assertEmailClaimable(
          manager,
          input.email,
          () => new WorkspaceOwnerConflictError(),
          reservation?.id,
        );
        const company = await manager.save(
          manager.create(Company, { name: 'Moja firma' }),
        );
        const user = await manager.save(
          Object.assign(reservation ?? manager.create(User), {
            email: input.email,
            password: 'passwordHash' in input ? input.passwordHash : null,
            googleId: 'googleId' in input ? input.googleId : null,
            firstName: 'googleId' in input ? input.firstName : null,
            lastName: 'googleId' in input ? input.lastName : null,
            emailVerifiedAt: 'googleId' in input ? input.emailVerifiedAt : null,
            verificationTokenHash:
              'verificationTokenHash' in input
                ? input.verificationTokenHash
                : null,
            verificationTokenExpiresAt:
              'verificationTokenExpiresAt' in input
                ? input.verificationTokenExpiresAt
                : null,
            passwordResetTokenHash: null,
            passwordResetTokenExpiresAt: null,
          }),
        );
        await manager.save(
          manager.create(Membership, {
            userId: user.id,
            companyId: company.id,
            role: MembershipRole.OWNER,
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
          hasPassword: 'passwordHash' in input,
        };
      });
    } catch (error) {
      if (
        error instanceof WorkspaceOwnerConflictError ||
        (error instanceof QueryFailedError &&
          (
            error.driverError as
              | { code?: string; constraint?: string }
              | undefined
          )?.code === '23505' &&
          ['IDX_users_email', 'IDX_users_googleId'].includes(
            (error.driverError as { constraint?: string }).constraint ?? '',
          ))
      ) {
        throw new WorkspaceOwnerConflictError();
      }
      throw error;
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
      phone: null,
      address: null,
      postalCode: null,
      city: null,
      pendingEmail: null,
      firstName: 'googleId' in input ? input.firstName : null,
      lastName: 'googleId' in input ? input.lastName : null,
      hasPassword: 'passwordHash' in input,
    });
  }
}
